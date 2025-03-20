import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    // In a real scenario, after validating credentials,
    // you'd send the user to a 2FA challenge step
    return this.authService.login(user);
  }

  // A simple 2FA endpoint example (for demonstration)
  @Post('verify-2fa')
  async verify2FA(@Body() body: { token: string; secret: string }) {
    const isValid = this.authService.verifyTOTP(body.token, body.secret);
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA token');
    }
    return { message: '2FA verified' };
  }
}

