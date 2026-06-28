import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthSession, AuthUser, UserRole } from '@tj-edu/shared';
import { compare } from 'bcryptjs';
import { UserRole as PrismaUserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getJwtExpiresInSeconds, getJwtSecret } from './auth.config';
import type { LoginDto } from './dto/login.dto';

const roleMap: Record<PrismaUserRole, UserRole> = {
  ADMIN: 'admin',
  ACADEMIC_ADMIN: 'academic_admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

interface AuthUserRecord {
  id: string;
  institutionId: string;
  displayName: string;
  role: PrismaUserRole;
  institution: { name: string };
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = getJwtSecret();
  private readonly jwtExpiresIn = getJwtExpiresInSeconds();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto): Promise<AuthSession> {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        active: true,
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier },
          { teacher: { is: { employeeNo: identifier } } },
          { student: { is: { studentNo: identifier } } }
        ]
      },
      select: {
        id: true,
        institutionId: true,
        displayName: true,
        role: true,
        passwordHash: true,
        institution: { select: { name: true } }
      }
    });

    if (!user?.passwordHash || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误。');
    }

    return this.createSession(this.mapUser(user));
  }

  async findAuthenticatedUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true },
      select: {
        id: true,
        institutionId: true,
        displayName: true,
        role: true,
        institution: { select: { name: true } }
      }
    });

    return user ? this.mapUser(user) : null;
  }

  async createSession(user: AuthUser): Promise<AuthSession> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        institutionId: user.institutionId,
        role: user.role
      },
      {
        secret: this.jwtSecret,
        expiresIn: this.jwtExpiresIn
      }
    );

    return {
      accessToken,
      expiresIn: this.jwtExpiresIn,
      user
    };
  }

  private mapUser(user: AuthUserRecord): AuthUser {
    return {
      id: user.id,
      institutionId: user.institutionId,
      institutionName: user.institution.name,
      displayName: user.displayName,
      role: roleMap[user.role]
    };
  }
}
