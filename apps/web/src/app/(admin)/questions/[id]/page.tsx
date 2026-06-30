'use client';

import type { ContentStatus, PaperType, QuestionDetail, QuestionType } from '@tj-edu/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredToken } from '../../../../lib/auth';
import { getQuestion } from '../../../../lib/questions';

const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  FILL_BLANK: '填空题',
  SHORT_ANSWER: '简答题',
  COMPREHENSIVE: '综合题'
};

const paperTypeLabels: Record<PaperType, string> = {
  EXAM: '考试真题',
  MOCK: '模拟卷',
  PRACTICE: '专项练习',
  SCHOOL_BASED: '校本卷'
};

const difficultyLabels = ['未设置', '基础', '较易', '中等', '较难', '困难'];

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档'
};

function formatAnswer(answer: unknown) {
  if (answer === null || answer === undefined) {
    return '暂未录入答案';
  }

  return typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2);
}

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (!token || !params.id) {
      return;
    }

    getQuestion(token, params.id)
      .then(setQuestion)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '题目详情加载失败。');
      });
  }, [params.id]);

  if (error) {
    return (
      <div className="empty-panel error-panel" role="alert">
        <h2>题目详情无法加载</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="empty-panel">
        <h2>正在加载题目详情</h2>
        <p>正在读取题干、答案和解析。</p>
      </div>
    );
  }

  return (
    <>
      <section className="page-header">
        <div>
          <Link className="back-link" href="/questions">
            返回题库
          </Link>
          <h1>题目详情</h1>
          <p>
            {question.subject.name} · {question.grade?.name ?? '通用'} ·{' '}
            {questionTypeLabels[question.type]}
          </p>
        </div>
        <span className="status-pill">{difficultyLabels[question.difficulty ?? 0]}</span>
      </section>

      <article className="question-detail">
        <section className="question-block">
          <h2>题干</h2>
          <p className="question-stem">{question.stem}</p>
        </section>

        <dl className="question-metadata">
          <div>
            <dt>区域</dt>
            <dd>{question.region?.name ?? '未指定'}</dd>
          </div>
          <div>
            <dt>知识点</dt>
            <dd>{question.knowledgePoints.map((point) => point.name).join('、') || '未关联'}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>{question.source ?? '未填写'}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{statusLabels[question.status]}</dd>
          </div>
        </dl>

        <section className="question-block">
          <h2>答案</h2>
          <pre className="answer-content">{formatAnswer(question.answer)}</pre>
        </section>

        <section className="question-block">
          <h2>解析</h2>
          <p>{question.analysis ?? '暂未录入解析。'}</p>
        </section>

        <section className="question-block">
          <h2>关联试卷</h2>
          {question.papers.length ? (
            <ul className="compact-list">
              {question.papers.map((paper) => (
                <li key={paper.id}>
                  <strong>{paper.title}</strong>
                  <span>
                    {paper.year ?? '年份未定'} · {paperTypeLabels[paper.type]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>暂未关联试卷。</p>
          )}
        </section>
      </article>
    </>
  );
}
