'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canAccessPath } from '../lib/permissions';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user } = useAuth();
  const allowed = Boolean(user && canAccessPath(pathname, user.role));

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [allowed, loading, router, user]);

  if (loading || !user || !allowed) {
    return <div className="auth-loading">正在验证登录状态...</div>;
  }

  return children;
}
