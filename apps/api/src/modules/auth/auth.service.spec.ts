import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { UserRole as PrismaUserRole } from '../../generated/prisma/client';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn()
    }
  };
  const jwtService = {
    signAsync: jest.fn()
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';
    process.env.JWT_EXPIRES_IN_SECONDS = '3600';
    prisma.user.findFirst.mockReset();
    jwtService.signAsync.mockReset().mockResolvedValue('signed-token');
  });

  it('returns a signed session for valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      institutionId: 'institution-1',
      displayName: '平台管理员',
      role: PrismaUserRole.ADMIN,
      passwordHash: await hash('Secret123!', 4),
      institution: { name: '示范机构' }
    });
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService
    );

    await expect(
      service.login({ identifier: 'admin@tj-edu.local', password: 'Secret123!' })
    ).resolves.toEqual({
      accessToken: 'signed-token',
      expiresIn: 3600,
      user: {
        id: 'user-1',
        institutionId: 'institution-1',
        institutionName: '示范机构',
        displayName: '平台管理员',
        role: 'admin'
      }
    });
  });

  it('rejects an incorrect password without exposing account state', async () => {
    prisma.user.findFirst.mockResolvedValue({
      passwordHash: await hash('Secret123!', 4)
    });
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService
    );

    await expect(
      service.login({ identifier: 'admin@tj-edu.local', password: 'Wrong123!' })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns null when the token user is no longer active', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService
    );

    await expect(service.findAuthenticatedUser('missing-user')).resolves.toBeNull();
  });
});
