'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/dashboard', label: '仪表盘' },
  { href: '/questions', label: '题库' },
  { href: '/handouts', label: '讲义' },
  { href: '/timetable', label: '课表' },
  { href: '/students', label: '学生档案' },
  { href: '/files', label: '文件库' }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>天津教辅平台</strong>
          <span>教学运营后台</span>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => (
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
          <span className="status-pill">MVP 构建中</span>
        </div>
        {children}
      </main>
    </div>
  );
}
