import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { EducationStage, PrismaClient, UserRole } from '../src/generated/prisma/client';

loadEnv({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@tj-edu.local';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

if (adminPassword.length < 8) {
  throw new Error('SEED_ADMIN_PASSWORD must contain at least 8 characters.');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const subjects = [
  { code: 'chinese', name: '语文' },
  { code: 'math', name: '数学' },
  { code: 'english', name: '英语' },
  { code: 'physics', name: '物理' },
  { code: 'chemistry', name: '化学' },
  { code: 'biology', name: '生物' },
  { code: 'politics', name: '道德与法治/政治' },
  { code: 'history', name: '历史' },
  { code: 'geography', name: '地理' }
] as const;

const grades = [
  { code: 'junior-1', name: '七年级', stage: EducationStage.JUNIOR_HIGH, level: 1 },
  { code: 'junior-2', name: '八年级', stage: EducationStage.JUNIOR_HIGH, level: 2 },
  { code: 'junior-3', name: '九年级', stage: EducationStage.JUNIOR_HIGH, level: 3 },
  { code: 'senior-1', name: '高一', stage: EducationStage.SENIOR_HIGH, level: 1 },
  { code: 'senior-2', name: '高二', stage: EducationStage.SENIOR_HIGH, level: 2 },
  { code: 'senior-3', name: '高三', stage: EducationStage.SENIOR_HIGH, level: 3 }
] as const;

const regions = [
  { code: '120101', name: '和平区' },
  { code: '120102', name: '河东区' },
  { code: '120103', name: '河西区' },
  { code: '120104', name: '南开区' },
  { code: '120105', name: '河北区' },
  { code: '120106', name: '红桥区' },
  { code: '120110', name: '东丽区' },
  { code: '120111', name: '西青区' },
  { code: '120112', name: '津南区' },
  { code: '120113', name: '北辰区' },
  { code: '120114', name: '武清区' },
  { code: '120115', name: '宝坻区' },
  { code: '120116', name: '滨海新区' },
  { code: '120117', name: '宁河区' },
  { code: '120118', name: '静海区' },
  { code: '120119', name: '蓟州区' }
] as const;

const knowledgePoints = [
  { subjectCode: 'math', gradeCode: 'junior-1', code: 'algebra-basics', name: '代数式基础' },
  { subjectCode: 'math', gradeCode: 'junior-3', code: 'quadratic-functions', name: '二次函数' },
  { subjectCode: 'math', gradeCode: 'senior-2', code: 'derivatives', name: '导数及其应用' },
  { subjectCode: 'chinese', gradeCode: 'junior-3', code: 'modern-reading', name: '现代文阅读' },
  {
    subjectCode: 'english',
    gradeCode: 'junior-3',
    code: 'reading-comprehension',
    name: '阅读理解'
  },
  { subjectCode: 'physics', gradeCode: 'junior-2', code: 'mechanics-basics', name: '力学基础' },
  {
    subjectCode: 'chemistry',
    gradeCode: 'junior-3',
    code: 'chemical-equations',
    name: '化学方程式'
  }
] as const;

async function main() {
  const institution = await prisma.institution.upsert({
    where: { code: 'demo' },
    update: { name: '天津教辅平台示范机构' },
    create: { code: 'demo', name: '天津教辅平台示范机构' }
  });

  const passwordHash = await hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { institutionId_email: { institutionId: institution.id, email: adminEmail } },
    update: {
      displayName: '平台管理员',
      passwordHash,
      role: UserRole.ADMIN,
      active: true
    },
    create: {
      institutionId: institution.id,
      email: adminEmail,
      displayName: '平台管理员',
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const subjectRecords = new Map<string, string>();
  for (const subject of subjects) {
    const record = await prisma.subject.upsert({
      where: { code: subject.code },
      update: { name: subject.name },
      create: subject
    });
    subjectRecords.set(subject.code, record.id);
  }

  const gradeRecords = new Map<string, string>();
  for (const grade of grades) {
    const record = await prisma.grade.upsert({
      where: { code: grade.code },
      update: { name: grade.name, stage: grade.stage, level: grade.level },
      create: grade
    });
    gradeRecords.set(grade.code, record.id);
  }

  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: region
    });
  }

  for (const point of knowledgePoints) {
    const subjectId = subjectRecords.get(point.subjectCode);
    const gradeId = gradeRecords.get(point.gradeCode);

    if (!subjectId || !gradeId) {
      throw new Error(`Missing seed dependency for knowledge point ${point.code}.`);
    }

    await prisma.knowledgePoint.upsert({
      where: { subjectId_code: { subjectId, code: point.code } },
      update: { gradeId, name: point.name },
      create: { subjectId, gradeId, code: point.code, name: point.name }
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
