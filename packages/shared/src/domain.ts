export const SUBJECTS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '道德与法治'
] as const;

export const TIANJIN_REGIONS = [
  '和平区',
  '河西区',
  '南开区',
  '河东区',
  '河北区',
  '红桥区',
  '滨海新区',
  '东丽区',
  '西青区',
  '津南区',
  '北辰区',
  '武清区',
  '宝坻区',
  '宁河区',
  '静海区',
  '蓟州区'
] as const;

export type SubjectName = (typeof SUBJECTS)[number];
export type TianjinRegion = (typeof TIANJIN_REGIONS)[number];

export type UserRole = 'admin' | 'academic_admin' | 'teacher' | 'student';

export interface HealthPayload {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}
