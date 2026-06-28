'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { navItems, roleLabels } from '../lib/permissions';
import { useAuth } from './AuthProvider';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const visibleNavItems = user ? navItems.filter((item) => item.roles.includes(user.role)) : [];

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>天津教辅平台</strong>
          <span>{user?.institutionName ?? '教学运营后台'}</span>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${pathname === item.href ? ' active' : ''}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h1>运营工作台</h1>
            <p>题库、讲义、课表、学生档案和错题本的统一入口</p>
          </div>
          <div className="topbar-user">
            <div className="user-identity">
              <strong>{user?.displayName}</strong>
              <span>{user ? roleLabels[user.role] : ''}</span>
            </div>
            <button className="secondary-button" onClick={handleLogout} type="button">
              退出登录
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
