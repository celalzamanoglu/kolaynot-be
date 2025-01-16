import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Storage } from '@google-cloud/storage';
import { SpeechClient, protos } from '@google-cloud/speech';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Recording, RecordingDocument } from './recording.schema';
import { Note, NoteDocument } from '../notes/note.schema';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private storage: Storage;
  private speechClient: SpeechClient;
  private openai: OpenAI;

  constructor(
    @InjectModel(Recording.name)
    private recordingModel: Model<RecordingDocument>,
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private configService: ConfigService,
  ) {
    this.storage = new Storage({
      projectId: this.configService.get('google.projectId'),
      keyFilename: this.configService.get('google.credentials'),
    });

    this.speechClient = new SpeechClient({
      projectId: this.configService.get('google.projectId'),
      keyFilename: this.configService.get('google.credentials'),
    });

    this.openai = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });

    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<RecordingDocument | null> {
    const recording = await this.recordingModel.findOne({ _id: id, userId });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }
    return recording;
  }

  async getAudioUrl(id: string, userId: string) {
    const recording = await this.findById(id, userId);
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const bucket = this.storage.bucket(
      this.configService.get('google.storageBucket'),
    );
    const file = bucket.file(recording.bucketPath);

    const exists = await file.exists();
    if (!exists[0]) {
      throw new NotFoundException('Audio file not found in storage');
    }

    // Generate a signed URL that expires in 1 hour
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return { url };
  }

  async deleteRecording(id: string, userId: string): Promise<void> {
    const recording = await this.recordingModel.findOne({ _id: id, userId });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    try {
      // Delete from Google Cloud Storage
      const bucket = this.storage.bucket(
        this.configService.get('google.storageBucket'),
      );
      const file = bucket.file(recording.bucketPath);
      await file.delete();

      // Delete associated note if exists
      if (recording.noteId) {
        await this.noteModel.deleteOne({ _id: recording.noteId });
      }

      // Delete recording
      await this.recordingModel.deleteOne({ _id: id });

      this.logger.log(
        `Successfully deleted recording and associated data: ${id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting recording: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async uploadRecording(
    file: Express.Multer.File,
    userId: string,
  ): Promise<RecordingDocument> {
    const bucket = this.storage.bucket(
      this.configService.get('google.storageBucket'),
    );

    try {
      // Convert M4A to WAV
      const wavBuffer = await this.convertToWav(file.buffer);
      this.logger.log(`Converted WAV buffer size: ${wavBuffer.length} bytes`);

      // Upload the converted WAV file
      const bucketPath = `${userId}/${Date.now()}-${file.originalname.replace('.m4a', '.wav')}`;
      const blob = bucket.file(bucketPath);

      await blob.save(wavBuffer, {
        contentType: 'audio/wav',
        metadata: {
          userId,
          originalName: file.originalname,
        },
      });

      const recording = new this.recordingModel({
        userId,
        bucketPath,
        status: 'pending',
      });

      await recording.save();
      await this.processRecording(recording._id.toString());

      return recording;
    } catch (error) {
      this.logger.error(
        `Error in uploadRecording: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${Date.now()}.m4a`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.wav`);

    try {
      // Write input buffer to temporary file
      fs.writeFileSync(inputPath, inputBuffer);
      this.logger.log(`Written input file to ${inputPath}`);

      // Convert to WAV
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('wav')
          .audioFrequency(16000)
          .audioChannels(1)
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => {
            this.logger.log('Audio conversion completed');
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`Error converting audio: ${err.message}`);
            reject(err);
          })
          .run();
      });

      // Read the output file
      const wavBuffer = fs.readFileSync(outputPath);
      this.logger.log(`Read WAV file, size: ${wavBuffer.length} bytes`);

      // Clean up temporary files
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

      return wavBuffer;
    } catch (error) {
      // Clean up temporary files in case of error
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      this.logger.error(`Error in convertToWav: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processRecording(recordingId: string) {
    const recording = await this.recordingModel.findById(recordingId);
    if (!recording) return;

    try {
      recording.status = 'processing';
      await recording.save();

      this.logger.log(
        `Starting transcription for file: ${recording.bucketPath}`,
      );
      const transcription = await this.transcribeAudio(recording.bucketPath);

      if (!transcription) {
        throw new Error('Transcription failed - empty result');
      }

      // Create note with transcription
      const note = await this.noteModel.create({
        userId: recording.userId,
        recordingId: recording._id.toString(),
        title: this.generateTitle(transcription),
        transcription: transcription,
        summary: await this.generateSummary(transcription),
      });

      // Update recording with note reference
      recording.noteId = note._id.toString();
      recording.status = 'completed';
      await recording.save();
    } catch (error) {
      this.logger.error(
        `Error processing recording: ${error.message}`,
        error.stack,
      );
      recording.status = 'failed';
      recording.error = error.message;
      await recording.save();
    }
  }

  private generateTitle(transcription: string): string {
    const firstSentence = transcription.split(/[.!?]/)[0];
    return firstSentence.length > 50
      ? `${firstSentence.substring(0, 47)}...`
      : firstSentence;
  }

  private async transcribeAudio(bucketPath: string): Promise<string> {
    const gcsUri = `gs://${this.configService.get('google.storageBucket')}/${bucketPath}`;

    const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest =
      {
        config: {
          encoding:
            protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
              .LINEAR16,
          sampleRateHertz: 16000,
          audioChannelCount: 1,
          languageCode: 'tr-TR',
          model: 'latest_long',
          useEnhanced: true,
          enableAutomaticPunctuation: true,
          enableWordConfidence: true,
          speechContexts: [
            {
              phrases: ['API', 'SDK', 'REST', 'HTTP'],
            },
          ],
        },
        audio: {
          uri: gcsUri,
        },
      };

    try {
      this.logger.log(`Starting long-running transcription for: ${gcsUri}`);
      const [operation] = await this.speechClient.longRunningRecognize(request);
      const [response] = await operation.promise();

      if (!response.results?.length) {
        throw new Error('No transcription results received');
      }

      // Combine all transcriptions
      const transcription = response.results
        .map((result) => result.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      if (!transcription) {
        throw new Error('Empty transcription result');
      }

      return transcription;
    } catch (error) {
      this.logger.error(
        `Error in transcribeAudio: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async generateSummary(transcription: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Sen bir toplantı asistanısın. Sana verilen toplantı metnini özetlemen gerekiyor. Önemli noktaları, kararları ve yapılacakları içeren bir özet hazırla.',
          },
          {
            role: 'user',
            content: transcription,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'Özet oluşturulamadı.';
    } catch (error) {
      this.logger.error(
        `Error generating summary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
