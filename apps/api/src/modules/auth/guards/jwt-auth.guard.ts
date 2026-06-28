import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { getJwtSecret } from '../auth.config';
import type { AuthenticatedRequest, JwtPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('请先登录。');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: getJwtSecret()
      });
      const user = await this.authService.findAuthenticatedUser(payload.sub);

      if (!user || user.institutionId !== payload.institutionId || user.role !== payload.role) {
        throw new UnauthorizedException('登录状态已失效。');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('登录状态已失效。');
    }
  }

  private extractBearerToken(request: AuthenticatedRequest) {
    const header = request.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
