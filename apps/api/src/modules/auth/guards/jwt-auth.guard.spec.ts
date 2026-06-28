import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const jwtService = { verifyAsync: jest.fn() };
  const authService = { findAuthenticatedUser: jest.fn() };

  function createContext(request: AuthenticatedRequest) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request })
    } as unknown as ExecutionContext;
  }

  function createGuard() {
    return new JwtAuthGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
      authService as unknown as AuthService
    );
  }

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';
    reflector.getAllAndOverride.mockReset();
    jwtService.verifyAsync.mockReset();
    authService.findAuthenticatedUser.mockReset();
  });

  it('allows routes marked as public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(createGuard().canActivate(createContext({ headers: {} }))).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects protected routes without a bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(createGuard().canActivate(createContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('attaches the current user for a valid token', async () => {
    const request: AuthenticatedRequest = { headers: { authorization: 'Bearer valid-token' } };
    const user = {
      id: 'user-1',
      institutionId: 'institution-1',
      institutionName: '示范机构',
      displayName: '平台管理员',
      role: 'admin' as const
    };
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      institutionId: user.institutionId,
      role: user.role
    });
    authService.findAuthenticatedUser.mockResolvedValue(user);

    await expect(createGuard().canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });
});
