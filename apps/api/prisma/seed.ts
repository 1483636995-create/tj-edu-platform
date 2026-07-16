import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import {
  ContentStatus,
  EducationStage,
  FileCategory,
  LessonStatus,
  LessonType,
  MasteryStatus,
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

  const builderPaperId = '10000000-0000-4000-8000-000000000101';
  const builderSubjectId = subjectRecords.get('math');
  const builderGradeId = gradeRecords.get('junior-3');
  const builderRegionId = regionRecords.get('120101');
  if (!builderSubjectId || !builderGradeId || !builderRegionId) {
    throw new Error('Missing seed dependency for builder paper.');
  }

  await prisma.paper.upsert({
    where: { id: builderPaperId },
    update: {
      institutionId: institution.id,
      subjectId: builderSubjectId,
      gradeId: builderGradeId,
      regionId: builderRegionId,
      createdById: admin.id,
      title: '二次函数知识点组题草稿',
      year: 2026,
      type: PaperType.PRACTICE,
      status: ContentStatus.DRAFT
    },
    create: {
      id: builderPaperId,
      institutionId: institution.id,
      subjectId: builderSubjectId,
      gradeId: builderGradeId,
      regionId: builderRegionId,
      createdById: admin.id,
      title: '二次函数知识点组题草稿',
      year: 2026,
      type: PaperType.PRACTICE,
      status: ContentStatus.DRAFT
    }
  });
  await prisma.paperQuestion.upsert({
    where: {
      paperId_questionId: {
        paperId: builderPaperId,
        questionId: '20000000-0000-4000-8000-000000000001'
      }
    },
    update: { sortOrder: 1, score: 10 },
    create: {
      paperId: builderPaperId,
      questionId: '20000000-0000-4000-8000-000000000001',
      sortOrder: 1,
      score: 10
    }
  });

  const teacherSeeds = [
    {
      userId: '30000000-0000-4000-8000-000000000101',
      teacherId: '31000000-0000-4000-8000-000000000101',
      email: 'teacher.wang@tj-edu.local',
      displayName: '王老师',
      employeeNo: 'T1001',
      subjectCodes: ['math']
    },
    {
      userId: '30000000-0000-4000-8000-000000000102',
      teacherId: '31000000-0000-4000-8000-000000000102',
      email: 'teacher.li@tj-edu.local',
      displayName: '李老师',
      employeeNo: 'T1002',
      subjectCodes: ['physics', 'english']
    }
  ] as const;
  const teacherRecords = new Map<string, string>();

  for (const teacherSeed of teacherSeeds) {
    await prisma.user.upsert({
      where: { id: teacherSeed.userId },
      update: {
        institutionId: institution.id,
        email: teacherSeed.email,
        displayName: teacherSeed.displayName,
        role: UserRole.TEACHER,
        active: true
      },
      create: {
        id: teacherSeed.userId,
        institutionId: institution.id,
        email: teacherSeed.email,
        displayName: teacherSeed.displayName,
        role: UserRole.TEACHER
      }
    });

    const teacher = await prisma.teacher.upsert({
      where: { userId: teacherSeed.userId },
      update: { institutionId: institution.id, employeeNo: teacherSeed.employeeNo },
      create: {
        id: teacherSeed.teacherId,
        institutionId: institution.id,
        userId: teacherSeed.userId,
        employeeNo: teacherSeed.employeeNo
      }
    });
    teacherRecords.set(teacherSeed.employeeNo, teacher.id);

    for (const subjectCode of teacherSeed.subjectCodes) {
      const subjectId = subjectRecords.get(subjectCode);
      if (!subjectId) {
        throw new Error(`Missing subject ${subjectCode} for teacher seed.`);
      }
      await prisma.teacherSubject.upsert({
        where: { teacherId_subjectId: { teacherId: teacher.id, subjectId } },
        update: {},
        create: { teacherId: teacher.id, subjectId }
      });
    }
  }

  const studentSeeds = [
    {
      userId: '30000000-0000-4000-8000-000000000201',
      studentId: '32000000-0000-4000-8000-000000000201',
      displayName: '陈晨',
      studentNo: 'S2001',
      gradeCode: 'junior-3'
    },
    {
      userId: '30000000-0000-4000-8000-000000000202',
      studentId: '32000000-0000-4000-8000-000000000202',
      displayName: '周然',
      studentNo: 'S2002',
      gradeCode: 'junior-2'
    },
    {
      userId: '30000000-0000-4000-8000-000000000203',
      studentId: '32000000-0000-4000-8000-000000000203',
      displayName: '赵一诺',
      studentNo: 'S2003',
      gradeCode: 'junior-1'
    }
  ] as const;
  const studentRecords = new Map<string, string>();

  for (const studentSeed of studentSeeds) {
    const gradeId = gradeRecords.get(studentSeed.gradeCode);
    if (!gradeId) {
      throw new Error(`Missing grade ${studentSeed.gradeCode} for student seed.`);
    }

    await prisma.user.upsert({
      where: { id: studentSeed.userId },
      update: {
        institutionId: institution.id,
        displayName: studentSeed.displayName,
        role: UserRole.STUDENT,
        active: true
      },
      create: {
        id: studentSeed.userId,
        institutionId: institution.id,
        displayName: studentSeed.displayName,
        role: UserRole.STUDENT
      }
    });

    const student = await prisma.student.upsert({
      where: { userId: studentSeed.userId },
      update: {
        institutionId: institution.id,
        studentNo: studentSeed.studentNo,
        gradeId
      },
      create: {
        id: studentSeed.studentId,
        institutionId: institution.id,
        userId: studentSeed.userId,
        studentNo: studentSeed.studentNo,
        gradeId
      }
    });
    studentRecords.set(studentSeed.studentNo, student.id);
  }

  const timetable = await prisma.timetable.upsert({
    where: { id: '40000000-0000-4000-8000-000000000001' },
    update: {
      institutionId: institution.id,
      name: '2026 暑期课表',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T00:00:00.000Z')
    },
    create: {
      id: '40000000-0000-4000-8000-000000000001',
      institutionId: institution.id,
      name: '2026 暑期课表',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T00:00:00.000Z')
    }
  });

  const lessonSeeds = [
    {
      id: '41000000-0000-4000-8000-000000000001',
      title: '九年级数学提高班',
      type: LessonType.GROUP,
      teacherNo: 'T1001',
      subjectCode: 'math',
      gradeCode: 'junior-3',
      classroom: 'A301',
      startsAt: '2026-06-29T10:30:00.000Z',
      endsAt: '2026-06-29T12:00:00.000Z',
      studentNos: ['S2001']
    },
    {
      id: '41000000-0000-4000-8000-000000000002',
      title: '八年级物理一对一',
      type: LessonType.ONE_ON_ONE,
      teacherNo: 'T1002',
      subjectCode: 'physics',
      gradeCode: 'junior-2',
      classroom: 'B202',
      startsAt: '2026-07-01T11:00:00.000Z',
      endsAt: '2026-07-01T12:30:00.000Z',
      studentNos: ['S2002']
    },
    {
      id: '41000000-0000-4000-8000-000000000003',
      title: '七年级英语阅读班',
      type: LessonType.GROUP,
      teacherNo: 'T1002',
      subjectCode: 'english',
      gradeCode: 'junior-1',
      classroom: 'A205',
      startsAt: '2026-07-02T10:30:00.000Z',
      endsAt: '2026-07-02T12:00:00.000Z',
      studentNos: ['S2003']
    },
    {
      id: '41000000-0000-4000-8000-000000000004',
      title: '中考数学专题冲刺',
      type: LessonType.GROUP,
      teacherNo: 'T1001',
      subjectCode: 'math',
      gradeCode: 'junior-3',
      classroom: 'A301',
      startsAt: '2026-07-04T01:00:00.000Z',
      endsAt: '2026-07-04T03:00:00.000Z',
      studentNos: ['S2001']
    }
  ] as const;

  for (const lessonSeed of lessonSeeds) {
    const teacherId = teacherRecords.get(lessonSeed.teacherNo);
    const subjectId = subjectRecords.get(lessonSeed.subjectCode);
    const gradeId = gradeRecords.get(lessonSeed.gradeCode);
    const studentIds = lessonSeed.studentNos.map((studentNo) => studentRecords.get(studentNo));
    if (!teacherId || !subjectId || !gradeId || studentIds.some((id) => !id)) {
      throw new Error(`Missing seed dependency for lesson ${lessonSeed.id}.`);
    }

    await prisma.lesson.upsert({
      where: { id: lessonSeed.id },
      update: {
        timetableId: timetable.id,
        teacherId,
        subjectId,
        gradeId,
        title: lessonSeed.title,
        type: lessonSeed.type,
        classroom: lessonSeed.classroom,
        startsAt: new Date(lessonSeed.startsAt),
        endsAt: new Date(lessonSeed.endsAt),
        status: LessonStatus.SCHEDULED
      },
      create: {
        id: lessonSeed.id,
        timetableId: timetable.id,
        teacherId,
        subjectId,
        gradeId,
        title: lessonSeed.title,
        type: lessonSeed.type,
        classroom: lessonSeed.classroom,
        startsAt: new Date(lessonSeed.startsAt),
        endsAt: new Date(lessonSeed.endsAt),
        status: LessonStatus.SCHEDULED
      }
    });

    await prisma.lessonStudent.deleteMany({ where: { lessonId: lessonSeed.id } });
    await prisma.lessonStudent.createMany({
      data: studentIds.map((studentId) => ({ lessonId: lessonSeed.id, studentId: studentId! }))
    });
  }

  const profileSeeds = [
    {
      studentNo: 'S2001',
      updatedByNo: 'T1001',
      summary: '数学二次函数基础较稳，压轴题读题和建模速度需要继续训练。',
      goals: '两周内完成二次函数综合题 20 道，错题复盘做到同类题能独立讲解。',
      notes: '课堂参与度高，建议每次课后补一条方法总结。'
    },
    {
      studentNo: 'S2002',
      updatedByNo: 'T1002',
      summary: '物理力学概念理解较快，计算步骤偶尔跳步。',
      goals: '本周重点巩固受力分析图和单位换算。',
      notes: '一对一课后需要保留草稿步骤，便于教师追踪错误来源。'
    },
    {
      studentNo: 'S2003',
      updatedByNo: 'T1002',
      summary: '英语阅读能抓主旨，细节题需要回文定位。',
      goals: '每天完成一篇阅读，标注题干关键词和原文依据。',
      notes: '词汇积累稳定，建议增加错因标签。'
    }
  ] as const;

  for (const profileSeed of profileSeeds) {
    const studentId = studentRecords.get(profileSeed.studentNo);
    const updatedById = teacherRecords.get(profileSeed.updatedByNo);
    if (!studentId || !updatedById) {
      throw new Error(`Missing seed dependency for student profile ${profileSeed.studentNo}.`);
    }

    await prisma.studentProfile.upsert({
      where: { studentId },
      update: {
        updatedById,
        summary: profileSeed.summary,
        goals: profileSeed.goals,
        notes: profileSeed.notes
      },
      create: {
        studentId,
        updatedById,
        summary: profileSeed.summary,
        goals: profileSeed.goals,
        notes: profileSeed.notes
      }
    });
  }

  const mistakeSeeds = [
    {
      id: '50000000-0000-4000-8000-000000000001',
      studentNo: 'S2001',
      questionId: '20000000-0000-4000-8000-000000000001',
      lessonId: '41000000-0000-4000-8000-000000000001',
      status: MasteryStatus.REVIEWING,
      wrongAnswer: { choice: 'A', value: 'x = 1' },
      notes: '对称轴公式记忆不稳定，需从配方过程重新推导。',
      occurredAt: '2026-06-29T12:05:00.000Z'
    },
    {
      id: '50000000-0000-4000-8000-000000000002',
      studentNo: 'S2001',
      questionId: '20000000-0000-4000-8000-000000000004',
      lessonId: '41000000-0000-4000-8000-000000000004',
      status: MasteryStatus.NEW,
      wrongAnswer: { points: ['照应标题'] },
      notes: '现代文结构作用回答不完整。',
      occurredAt: '2026-07-04T03:10:00.000Z'
    },
    {
      id: '50000000-0000-4000-8000-000000000003',
      studentNo: 'S2002',
      questionId: '20000000-0000-4000-8000-000000000002',
      lessonId: '41000000-0000-4000-8000-000000000002',
      status: MasteryStatus.REVIEWING,
      wrongAnswer: { value: 2, unit: 'N' },
      notes: '混淆质量和重力，需强化公式 G = mg。',
      occurredAt: '2026-07-01T12:35:00.000Z'
    },
    {
      id: '50000000-0000-4000-8000-000000000004',
      studentNo: 'S2003',
      questionId: '20000000-0000-4000-8000-000000000003',
      lessonId: '41000000-0000-4000-8000-000000000003',
      status: MasteryStatus.MASTERED,
      wrongAnswer: { keywords: ['weekly plan'] },
      notes: '已能回到原文定位关键词。',
      occurredAt: '2026-07-02T12:05:00.000Z',
      resolvedAt: '2026-07-03T10:00:00.000Z'
    }
  ] as const;

  for (const mistakeSeed of mistakeSeeds) {
    const studentId = studentRecords.get(mistakeSeed.studentNo);
    const resolvedAt =
      'resolvedAt' in mistakeSeed && mistakeSeed.resolvedAt
        ? new Date(mistakeSeed.resolvedAt)
        : null;
    if (!studentId) {
      throw new Error(`Missing seed dependency for mistake ${mistakeSeed.id}.`);
    }

    await prisma.mistake.upsert({
      where: { id: mistakeSeed.id },
      update: {
        studentId,
        questionId: mistakeSeed.questionId,
        lessonId: mistakeSeed.lessonId,
        status: mistakeSeed.status,
        wrongAnswer: mistakeSeed.wrongAnswer,
        notes: mistakeSeed.notes,
        occurredAt: new Date(mistakeSeed.occurredAt),
        resolvedAt
      },
      create: {
        id: mistakeSeed.id,
        studentId,
        questionId: mistakeSeed.questionId,
        lessonId: mistakeSeed.lessonId,
        status: mistakeSeed.status,
        wrongAnswer: mistakeSeed.wrongAnswer,
        notes: mistakeSeed.notes,
        occurredAt: new Date(mistakeSeed.occurredAt),
        resolvedAt
      }
    });
  }

  const fileAssetSeeds = [
    {
      id: '60000000-0000-4000-8000-000000000001',
      subjectCode: 'math',
      gradeCode: 'junior-3',
      knowledgePointCode: 'quadratic-functions',
      name: '二次函数图像讲义素材.pdf',
      storageKey: 'seed/demo/math-quadratic-functions.pdf',
      mimeType: 'application/pdf',
      size: 128000,
      category: FileCategory.TEACHING_MATERIAL
    },
    {
      id: '60000000-0000-4000-8000-000000000002',
      subjectCode: 'physics',
      gradeCode: 'junior-2',
      knowledgePointCode: 'mechanics-basics',
      name: '力学基础课堂例题.docx',
      storageKey: 'seed/demo/physics-mechanics-basics.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 96000,
      category: FileCategory.HANDOUT
    }
  ] as const;
  const fileAssetRecords = new Map<string, string>();

  for (const fileSeed of fileAssetSeeds) {
    const subjectId = subjectRecords.get(fileSeed.subjectCode);
    const gradeId = gradeRecords.get(fileSeed.gradeCode);
    const knowledgePointId = knowledgePointRecords.get(fileSeed.knowledgePointCode);
    if (!subjectId || !gradeId || !knowledgePointId) {
      throw new Error(`Missing seed dependency for file asset ${fileSeed.id}.`);
    }

    await prisma.fileAsset.upsert({
      where: { id: fileSeed.id },
      update: {
        institutionId: institution.id,
        uploadedById: admin.id,
        subjectId,
        gradeId,
        name: fileSeed.name,
        storageKey: fileSeed.storageKey,
        mimeType: fileSeed.mimeType,
        size: BigInt(fileSeed.size),
        category: fileSeed.category
      },
      create: {
        id: fileSeed.id,
        institutionId: institution.id,
        uploadedById: admin.id,
        subjectId,
        gradeId,
        name: fileSeed.name,
        storageKey: fileSeed.storageKey,
        mimeType: fileSeed.mimeType,
        size: BigInt(fileSeed.size),
        category: fileSeed.category
      }
    });
    await prisma.fileAssetKnowledgePoint.upsert({
      where: {
        fileAssetId_knowledgePointId: { fileAssetId: fileSeed.id, knowledgePointId }
      },
      update: {},
      create: { fileAssetId: fileSeed.id, knowledgePointId }
    });
    fileAssetRecords.set(fileSeed.id, fileSeed.id);
  }

  const handoutId = '70000000-0000-4000-8000-000000000001';
  const handoutSubjectId = subjectRecords.get('math');
  const handoutGradeId = gradeRecords.get('junior-3');
  const handoutKnowledgePointId = knowledgePointRecords.get('quadratic-functions');
  const handoutFileId = fileAssetRecords.get('60000000-0000-4000-8000-000000000001');
  if (!handoutSubjectId || !handoutGradeId || !handoutKnowledgePointId || !handoutFileId) {
    throw new Error('Missing seed dependency for handout draft.');
  }

  await prisma.handoutDraft.upsert({
    where: { id: handoutId },
    update: {
      institutionId: institution.id,
      createdById: admin.id,
      subjectId: handoutSubjectId,
      gradeId: handoutGradeId,
      title: '九年级数学二次函数专题讲义',
      objective: '围绕二次函数图像、对称轴和压轴题建模，形成课堂讲解与随堂练习结构。',
      status: ContentStatus.DRAFT
    },
    create: {
      id: handoutId,
      institutionId: institution.id,
      createdById: admin.id,
      subjectId: handoutSubjectId,
      gradeId: handoutGradeId,
      title: '九年级数学二次函数专题讲义',
      objective: '围绕二次函数图像、对称轴和压轴题建模，形成课堂讲解与随堂练习结构。',
      status: ContentStatus.DRAFT
    }
  });
  await prisma.handoutDraftKnowledgePoint.deleteMany({ where: { handoutDraftId: handoutId } });
  await prisma.handoutDraftQuestion.deleteMany({ where: { handoutDraftId: handoutId } });
  await prisma.handoutDraftFile.deleteMany({ where: { handoutDraftId: handoutId } });
  await prisma.handoutDraftKnowledgePoint.create({
    data: { handoutDraftId: handoutId, knowledgePointId: handoutKnowledgePointId, sortOrder: 0 }
  });
  await prisma.handoutDraftQuestion.create({
    data: {
      handoutDraftId: handoutId,
      questionId: '20000000-0000-4000-8000-000000000001',
      sortOrder: 0
    }
  });
  await prisma.handoutDraftFile.create({
    data: { handoutDraftId: handoutId, fileAssetId: handoutFileId, sortOrder: 0 }
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
