import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({
  timestamps: true,
  collection: 'notes',
  toJSON: {
    transform: (_, ret) => {
      ret._id = ret._id.toString();
      return ret;
    },
  },
})
export class Note {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  recordingId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  transcription: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ required: true, default: false, index: true })
  isFavorite: boolean;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
