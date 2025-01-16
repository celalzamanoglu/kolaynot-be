import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { Recording, RecordingSchema } from './recording.schema';
import { Note, NoteSchema } from '../notes/note.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recording.name, schema: RecordingSchema },
      { name: Note.name, schema: NoteSchema },
    ]),
  ],
  controllers: [RecordingsController],
  providers: [RecordingsService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
