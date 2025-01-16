import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RecordingDocument = Recording & Document;

@Schema({ timestamps: true })
export class Recording {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  bucketPath: string;

  @Prop()
  noteId?: string;

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  duration?: number;

  @Prop()
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const RecordingSchema = SchemaFactory.createForClass(Recording);
