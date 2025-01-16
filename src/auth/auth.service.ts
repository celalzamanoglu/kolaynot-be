import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async handleUserAuth(firebaseUid: string, phoneNumber: string) {
    // Check if user exists
    let user = await this.usersService.findByFirebaseUid(firebaseUid);

    if (!user) {
      // First time sign in - create user in our database
      const appUserId = uuidv4(); // Generate unique ID for RevenueCat
      user = await this.usersService.createUser(
        firebaseUid,
        phoneNumber,
        appUserId,
      );
    }

    return user;
  }
}
