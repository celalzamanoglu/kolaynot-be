import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      const serviceAccount = JSON.parse(
        readFileSync(
          join(process.cwd(), 'firebase-service-account.json'),
          'utf8',
        ),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }
}
