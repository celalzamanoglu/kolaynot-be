import { Controller, UseGuards, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('login')
  async login(@Request() req) {
    // Firebase auth is already verified by the guard
    // Create/update user in our database
    return this.authService.handleUserAuth(
      req.user.userId,
      req.user.phoneNumber,
    );
  }
}
