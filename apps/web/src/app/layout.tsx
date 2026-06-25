import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '天津教辅平台',
  description: '题库、讲义、课表、学生档案和错题本一体化平台'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
