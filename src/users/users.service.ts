import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUid });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber });
  }

  async createUser(
    firebaseUid: string,
    phoneNumber: string,
    appUserId: string,
  ): Promise<UserDocument> {
    const user = new this.userModel({
      firebaseUid,
      phoneNumber,
      appUserId,
    });
    return user.save();
  }

  async updateDeviceInfo(
    userId: string,
    platform: string,
    pushToken: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOne({ firebaseUid: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deviceInfo = { platform, pushToken };
    return user.save();
  }
}
