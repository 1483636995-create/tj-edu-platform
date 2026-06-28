import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthSession, AuthUser, LogoutResult } from '@tj-edu/shared';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthSession> {
    return this.authService.login(dto);
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@CurrentUser() user: AuthUser): Promise<AuthSession> {
    return this.authService.createSession(user);
  }

  @Post('logout')
  @HttpCode(200)
  logout(): LogoutResult {
    return { success: true };
  }
}
