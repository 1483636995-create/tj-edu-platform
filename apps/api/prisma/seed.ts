import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import {
  ContentStatus,
  EducationStage,
  PaperType,
  PrismaClient,
  QuestionType,
  UserRole
} from '../src/generated/prisma/client';

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
  const admin = await prisma.user.upsert({
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

  const regionRecords = new Map<string, string>();
  for (const region of regions) {
    const record = await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: region
    });
    regionRecords.set(region.code, record.id);
  }

  const knowledgePointRecords = new Map<string, string>();
  for (const point of knowledgePoints) {
    const subjectId = subjectRecords.get(point.subjectCode);
    const gradeId = gradeRecords.get(point.gradeCode);

    if (!subjectId || !gradeId) {
      throw new Error(`Missing seed dependency for knowledge point ${point.code}.`);
    }

    const record = await prisma.knowledgePoint.upsert({
      where: { subjectId_code: { subjectId, code: point.code } },
      update: { gradeId, name: point.name },
      create: { subjectId, gradeId, code: point.code, name: point.name }
    });
    knowledgePointRecords.set(point.code, record.id);
  }

  const paperSeeds = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      subjectCode: 'math',
      gradeCode: 'junior-3',
      regionCode: '120101',
      title: '2025 天津中考数学模拟卷',
      year: 2025,
      type: PaperType.EXAM
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      subjectCode: 'physics',
      gradeCode: 'junior-2',
      regionCode: '120103',
      title: '2024 河西区八年级物理模拟卷',
      year: 2024,
      type: PaperType.MOCK
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      subjectCode: 'english',
      gradeCode: 'junior-3',
      regionCode: '120104',
      title: '2025 南开区九年级英语校本卷',
      year: 2025,
      type: PaperType.SCHOOL_BASED
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      subjectCode: 'chinese',
      gradeCode: 'junior-3',
      regionCode: '120102',
      title: '2024 河东区九年级语文专项练习',
      year: 2024,
      type: PaperType.PRACTICE
    }
  ] as const;

  const paperRecords = new Map<string, string>();
  for (const paper of paperSeeds) {
    const subjectId = subjectRecords.get(paper.subjectCode);
    const gradeId = gradeRecords.get(paper.gradeCode);
    const regionId = regionRecords.get(paper.regionCode);

    if (!subjectId || !gradeId || !regionId) {
      throw new Error(`Missing seed dependency for paper ${paper.title}.`);
    }

    const record = await prisma.paper.upsert({
      where: { id: paper.id },
      update: {
        institutionId: institution.id,
        subjectId,
        gradeId,
        regionId,
        createdById: admin.id,
        title: paper.title,
        year: paper.year,
        type: paper.type,
        status: ContentStatus.PUBLISHED
      },
      create: {
        id: paper.id,
        institutionId: institution.id,
        subjectId,
        gradeId,
        regionId,
        createdById: admin.id,
        title: paper.title,
        year: paper.year,
        type: paper.type,
        status: ContentStatus.PUBLISHED
      }
    });
    paperRecords.set(paper.id, record.id);
  }

  const questionSeeds = [
    {
      id: '20000000-0000-4000-8000-000000000001',
      paperId: '10000000-0000-4000-8000-000000000001',
      subjectCode: 'math',
      gradeCode: 'junior-3',
      regionCode: '120101',
      knowledgePointCode: 'quadratic-functions',
      type: QuestionType.SINGLE_CHOICE,
      stem: '已知二次函数 y = x² - 4x + 3，则该函数图象的对称轴是（ ）。',
      answer: { choice: 'B', value: 'x = 2' },
      analysis: '配方得 y = (x - 2)² - 1，因此对称轴为 x = 2。',
      difficulty: 3,
      source: '2025 天津中考数学模拟卷'
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      paperId: '10000000-0000-4000-8000-000000000002',
      subjectCode: 'physics',
      gradeCode: 'junior-2',
      regionCode: '120103',
      knowledgePointCode: 'mechanics-basics',
      type: QuestionType.SHORT_ANSWER,
      stem: '一个质量为 2 kg 的物体静止在水平桌面上，求物体受到的重力大小（g 取 10 N/kg）。',
      answer: { value: 20, unit: 'N' },
      analysis: '根据 G = mg，代入 m = 2 kg、g = 10 N/kg，得 G = 20 N。',
      difficulty: 2,
      source: '2024 河西区八年级物理模拟卷'
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      paperId: '10000000-0000-4000-8000-000000000003',
      subjectCode: 'english',
      gradeCode: 'junior-3',
      regionCode: '120104',
      knowledgePointCode: 'reading-comprehension',
      type: QuestionType.COMPREHENSIVE,
      stem: 'Read the passage and explain why the student changed the way she planned her study time.',
      answer: { keywords: ['reflection', 'priorities', 'weekly plan'] },
      analysis:
        'The answer should connect her reflection on missed tasks with a clearer weekly priority plan.',
      difficulty: 4,
      source: '2025 南开区九年级英语校本卷'
    },
    {
      id: '20000000-0000-4000-8000-000000000004',
      paperId: '10000000-0000-4000-8000-000000000004',
      subjectCode: 'chinese',
      gradeCode: 'junior-3',
      regionCode: '120102',
      knowledgePointCode: 'modern-reading',
      type: QuestionType.SHORT_ANSWER,
      stem: '结合文章语境，简要分析结尾画线句在内容和结构上的作用。',
      answer: { points: ['深化主题', '照应标题', '首尾呼应'] },
      analysis: '应从内容主旨和篇章结构两个角度作答，并结合具体语境说明。',
      difficulty: 4,
      source: '2024 河东区九年级语文专项练习'
    }
  ] as const;

  for (const question of questionSeeds) {
    const subjectId = subjectRecords.get(question.subjectCode);
    const gradeId = gradeRecords.get(question.gradeCode);
    const regionId = regionRecords.get(question.regionCode);
    const knowledgePointId = knowledgePointRecords.get(question.knowledgePointCode);
    const paperId = paperRecords.get(question.paperId);

    if (!subjectId || !gradeId || !regionId || !knowledgePointId || !paperId) {
      throw new Error(`Missing seed dependency for question ${question.id}.`);
    }

    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        institutionId: institution.id,
        subjectId,
        gradeId,
        regionId,
        createdById: admin.id,
        type: question.type,
        status: ContentStatus.PUBLISHED,
        stem: question.stem,
        answer: question.answer,
        analysis: question.analysis,
        difficulty: question.difficulty,
        source: question.source
      },
      create: {
        id: question.id,
        institutionId: institution.id,
        subjectId,
        gradeId,
        regionId,
        createdById: admin.id,
        type: question.type,
        status: ContentStatus.PUBLISHED,
        stem: question.stem,
        answer: question.answer,
        analysis: question.analysis,
        difficulty: question.difficulty,
        source: question.source
      }
    });

    await prisma.questionKnowledgePoint.upsert({
      where: { questionId_knowledgePointId: { questionId: question.id, knowledgePointId } },
      update: {},
      create: { questionId: question.id, knowledgePointId }
    });

    await prisma.paperQuestion.upsert({
      where: { paperId_questionId: { paperId, questionId: question.id } },
      update: { sortOrder: 1, score: 10 },
      create: { paperId, questionId: question.id, sortOrder: 1, score: 10 }
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
