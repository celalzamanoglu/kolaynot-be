import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  firebaseUid: string;

  @Prop({ required: true, unique: true })
  appUserId: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({
    type: {
      platform: String,
      pushToken: String,
    },
    required: false,
  })
  deviceInfo?: {
    platform: string;
    pushToken: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
