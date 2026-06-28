import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth.types';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn()
  };

  function createContext(request: AuthenticatedRequest) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request })
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it('allows routes without an explicit role requirement', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(createContext({ headers: {} }))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'academic_admin']);
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(
      guard.canActivate(
        createContext({
          headers: {},
          user: {
            id: 'user-1',
            institutionId: 'institution-1',
            institutionName: '示范机构',
            displayName: '平台管理员',
            role: 'admin'
          }
        })
      )
    ).toBe(true);
  });

  it('rejects a user whose role is not listed', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(
      guard.canActivate(
        createContext({
          headers: {},
          user: {
            id: 'user-2',
            institutionId: 'institution-1',
            institutionName: '示范机构',
            displayName: '任课教师',
            role: 'teacher'
          }
        })
      )
    ).toBe(false);
  });
});
