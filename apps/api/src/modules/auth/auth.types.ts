import type { AuthUser, UserRole } from '@tj-edu/shared';

export interface JwtPayload {
  sub: string;
  institutionId: string;
  role: UserRole;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}
