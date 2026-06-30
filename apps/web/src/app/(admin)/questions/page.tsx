'use client';

import type { PaperType, QuestionFilterOptions, QuestionListResponse } from '@tj-edu/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../../lib/auth';
import { getQuestionFilters, listQuestions } from '../../../lib/questions';

const paperTypeLabels: Record<PaperType, string> = {
  EXAM: '考试真题',
  MOCK: '模拟卷',
  PRACTICE: '专项练习',
  SCHOOL_BASED: '校本卷'
};

const difficultyLabels = ['未设置', '基础', '较易', '中等', '较难', '困难'];

interface FilterState {
  subjectId: string;
  gradeId: string;
  regionId: string;
  year: string;
  paperType: PaperType | '';
  knowledgePointId: string;
}

const initialFilters: FilterState = {
  subjectId: '',
  gradeId: '',
  regionId: '',
  year: '',
  paperType: '',
  knowledgePointId: ''
};

export default function QuestionsPage() {
  const [options, setOptions] = useState<QuestionFilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [result, setResult] = useState<QuestionListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    getQuestionFilters(token)
      .then(setOptions)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '筛选项加载失败。');
      });
  }, []);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    listQuestions(token, { ...filters, page, pageSize: 10 })
      .then(setResult)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '题目加载失败。');
      })
      .finally(() => setLoading(false));
  }, [filters, page]);

  const visibleKnowledgePoints = useMemo(() => {
    if (!options) {
      return [];
    }

    return options.knowledgePoints.filter(
      (point) =>
        (!filters.subjectId || point.subjectId === filters.subjectId) &&
        (!filters.gradeId || !point.gradeId || point.gradeId === filters.gradeId)
    );
  }, [filters.gradeId, filters.subjectId, options]);

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'subjectId' || key === 'gradeId' ? { knowledgePointId: '' } : {})
    }));
    setPage(1);
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>题库</h1>
          <p>按学科、年级、区域、年份、试卷类型和知识点筛选题目。</p>
        </div>
        <span className="status-pill">{result?.total ?? 0} 道题</span>
      </section>

      <div className="filter-strip question-filter-strip" aria-label="题库筛选">
        <select
          aria-label="学科"
          onChange={(event) => updateFilter('subjectId', event.target.value)}
          value={filters.subjectId}
        >
          <option value="">全部学科</option>
          {options?.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="年级"
          onChange={(event) => updateFilter('gradeId', event.target.value)}
          value={filters.gradeId}
        >
          <option value="">全部年级</option>
          {options?.grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
        <select
          aria-label="区域"
          onChange={(event) => updateFilter('regionId', event.target.value)}
          value={filters.regionId}
        >
          <option value="">全部区域</option>
          {options?.regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
        <select
          aria-label="年份"
          onChange={(event) => updateFilter('year', event.target.value)}
          value={filters.year}
        >
          <option value="">全部年份</option>
          {options?.years.map((year) => (
            <option key={year} value={year}>
              {year} 年
            </option>
          ))}
        </select>
        <select
          aria-label="试卷类型"
          onChange={(event) => updateFilter('paperType', event.target.value as PaperType | '')}
          value={filters.paperType}
        >
          <option value="">全部试卷类型</option>
          {options?.paperTypes.map((paperType) => (
            <option key={paperType} value={paperType}>
              {paperTypeLabels[paperType]}
            </option>
          ))}
        </select>
        <select
          aria-label="知识点"
          onChange={(event) => updateFilter('knowledgePointId', event.target.value)}
          value={filters.knowledgePointId}
        >
          <option value="">全部知识点</option>
          {visibleKnowledgePoints.map((point) => (
            <option key={point.id} value={point.id}>
              {point.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="empty-panel error-panel" role="alert">
          <h2>题库暂时无法加载</h2>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="empty-panel">
          <h2>正在加载题目</h2>
          <p>正在读取当前机构可访问的题目数据。</p>
        </div>
      ) : result?.items.length ? (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>题目</th>
                  <th>学科 / 年级</th>
                  <th>知识点</th>
                  <th>试卷 / 来源</th>
                  <th>难度</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((question) => {
                  const paper = question.papers[0];
                  return (
                    <tr key={question.id}>
                      <td className="question-stem-cell">
                        <Link className="question-link" href={`/questions/${question.id}`}>
                          {question.stem}
                        </Link>
                      </td>
                      <td>
                        {question.subject.name}
                        <span className="table-secondary">{question.grade?.name ?? '通用'}</span>
                      </td>
                      <td>
                        {question.knowledgePoints.map((point) => point.name).join('、') || '未关联'}
                      </td>
                      <td>
                        {paper?.title ?? question.source ?? '未填写'}
                        {paper?.year ? (
                          <span className="table-secondary">{paper.year} 年</span>
                        ) : null}
                      </td>
                      <td>{difficultyLabels[question.difficulty ?? 0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination" aria-label="题库分页">
            <span>
              第 {result.page} / {result.totalPages} 页
            </span>
            <div>
              <button
                className="secondary-button"
                disabled={result.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                上一页
              </button>
              <button
                className="secondary-button"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <h2>没有符合条件的题目</h2>
          <p>调整筛选条件后重试，或通过 API 录入新题目。</p>
        </div>
      )}
    </>
  );
}
