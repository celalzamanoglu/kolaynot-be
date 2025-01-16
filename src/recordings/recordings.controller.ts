import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordingsService } from './recordings.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

@Controller('recordings')
@UseGuards(FirebaseAuthGuard)
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get(':id')
  async getAudioUrl(@Param('id') id: string, @Req() req) {
    return this.recordingsService.getAudioUrl(id, req.user.userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRecording(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.recordingsService.uploadRecording(file, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.recordingsService.deleteRecording(id, req.user.userId);
  }
}
