import type { UserRole } from '@tj-edu/shared';

const allRoles: UserRole[] = ['admin', 'academic_admin', 'teacher', 'student'];
const staffRoles: UserRole[] = ['admin', 'academic_admin', 'teacher'];

export const navItems: Array<{ href: string; label: string; roles: UserRole[] }> = [
  { href: '/dashboard', label: '仪表盘', roles: allRoles },
  { href: '/questions', label: '题库', roles: staffRoles },
  { href: '/papers', label: '组题', roles: staffRoles },
  { href: '/handouts', label: '讲义', roles: staffRoles },
  { href: '/timetable', label: '课表', roles: allRoles },
  { href: '/students', label: '学生档案', roles: staffRoles },
  { href: '/files', label: '文件库', roles: staffRoles }
];

export const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  academic_admin: '教务',
  teacher: '教师',
  student: '学生'
};

export function canAccessPath(pathname: string, role: UserRole) {
  const item = navItems.find(
    ({ href }) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
  );
  return !item || item.roles.includes(role);
}
