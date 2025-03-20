import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // Basic user validation (replace with your own logic)
  async validateUser(username: string, pass: string): Promise<any> {
    if (username === 'user' && pass === 'password') {
      return { userId: 1, username: 'user', totpSecret: authenticator.generateSecret() };
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Example TOTP verification method
  verifyTOTP(token: string, secret: string): boolean {
    return authenticator.check(token, secret);
  }
}

