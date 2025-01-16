import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import * as admin from 'firebase-admin';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('test-firebase')
  async testFirebase() {
    try {
      const listUsersResult = await admin.auth().listUsers(1);
      return {
        success: true,
        message: 'Firebase connection successful',
        userCount: listUsersResult.users.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Firebase connection failed',
        error: error.message,
      };
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.usersService.findByFirebaseUid(req.user.userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('device-info')
  async updateDeviceInfo(
    @Request() req,
    @Body('platform') platform: string,
    @Body('pushToken') pushToken: string,
  ) {
    return this.usersService.updateDeviceInfo(
      req.user.userId,
      platform,
      pushToken,
    );
  }
}
