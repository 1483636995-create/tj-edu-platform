'use client';

import type { FileCategory, FileFilterOptions, FileListResponse } from '@tj-edu/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../../lib/auth';
import { downloadFile, getFileFilters, listFiles, uploadFile } from '../../../lib/files';

const categoryLabels: Record<FileCategory, string> = {
  TEACHING_MATERIAL: '教材素材',
  PAPER: '试卷',
  ANSWER: '答案解析',
  HANDOUT: '讲义',
  OTHER: '其他'
};

interface FilterState {
  subjectId: string;
  gradeId: string;
  regionId: string;
  knowledgePointId: string;
  category: FileCategory | '';
  search: string;
}

const initialFilters: FilterState = {
  subjectId: '',
  gradeId: '',
  regionId: '',
  knowledgePointId: '',
  category: '',
  search: ''
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [options, setOptions] = useState<FileFilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [result, setResult] = useState<FileListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('TEACHING_MATERIAL');
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadGradeId, setUploadGradeId] = useState('');
  const [uploadRegionId, setUploadRegionId] = useState('');
  const [uploadKnowledgePointId, setUploadKnowledgePointId] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    getFileFilters(token)
      .then(setOptions)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '筛选项加载失败。');
      });
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    listFiles(token, { ...filters, page, pageSize: 10 })
      .then(setResult)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '文件列表加载失败。');
      })
      .finally(() => setLoading(false));
  }, [filters, page, reloadKey]);

  const filterKnowledgePoints = useMemo(
    () =>
      options?.knowledgePoints.filter(
        (point) =>
          (!filters.subjectId || point.subjectId === filters.subjectId) &&
          (!filters.gradeId || !point.gradeId || point.gradeId === filters.gradeId)
      ) ?? [],
    [filters.gradeId, filters.subjectId, options]
  );

  const uploadKnowledgePoints = useMemo(
    () =>
      options?.knowledgePoints.filter(
        (point) =>
          (!uploadSubjectId || point.subjectId === uploadSubjectId) &&
          (!uploadGradeId || !point.gradeId || point.gradeId === uploadGradeId)
      ) ?? [],
    [options, uploadGradeId, uploadSubjectId]
  );

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'subjectId' || key === 'gradeId' ? { knowledgePointId: '' } : {})
    }));
    setPage(1);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = getStoredToken();

    if (!token || !selectedFile) {
      setUploadMessage('请先选择文件。');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      await uploadFile(token, {
        file: selectedFile,
        category: uploadCategory,
        subjectId: uploadSubjectId || undefined,
        gradeId: uploadGradeId || undefined,
        regionId: uploadRegionId || undefined,
        knowledgePointIds: uploadKnowledgePointId ? [uploadKnowledgePointId] : undefined
      });
      setSelectedFile(null);
      form.reset();
      setUploadMessage('文件上传成功。');
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setUploadMessage(requestError instanceof Error ? requestError.message : '文件上传失败。');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(fileId: string) {
    const token = getStoredToken();
    const file = result?.items.find((item) => item.id === fileId);
    if (!token || !file) return;

    try {
      await downloadFile(token, file);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '文件下载失败。');
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>文件库</h1>
          <p>集中沉淀试卷、讲义、答案和教材素材，并按教学维度快速检索。</p>
        </div>
        <span className="status-pill">{result?.total ?? 0} 个文件</span>
      </section>

      <form className="file-upload-panel" onSubmit={handleUpload}>
        <div className="file-upload-heading">
          <div>
            <h2>上传文件</h2>
            <p>单个文件不超过 20 MB。</p>
          </div>
          <button className="primary-button" disabled={uploading} type="submit">
            {uploading ? '正在上传' : '上传'}
          </button>
        </div>
        <div className="file-upload-fields">
          <label className="file-picker">
            <span>文件</span>
            <input
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              required
              type="file"
            />
          </label>
          <label>
            <span>分类</span>
            <select
              onChange={(event) => setUploadCategory(event.target.value as FileCategory)}
              value={uploadCategory}
            >
              {options?.categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>学科</span>
            <select
              onChange={(event) => {
                setUploadSubjectId(event.target.value);
                setUploadKnowledgePointId('');
              }}
              value={uploadSubjectId}
            >
              <option value="">不限定</option>
              {options?.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>年级</span>
            <select
              onChange={(event) => {
                setUploadGradeId(event.target.value);
                setUploadKnowledgePointId('');
              }}
              value={uploadGradeId}
            >
              <option value="">不限定</option>
              {options?.grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>区域</span>
            <select
              onChange={(event) => setUploadRegionId(event.target.value)}
              value={uploadRegionId}
            >
              <option value="">不限定</option>
              {options?.regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>知识点</span>
            <select
              onChange={(event) => setUploadKnowledgePointId(event.target.value)}
              value={uploadKnowledgePointId}
            >
              <option value="">不限定</option>
              {uploadKnowledgePoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {uploadMessage ? (
          <p className="form-message" role="status">
            {uploadMessage}
          </p>
        ) : null}
      </form>

      <div className="filter-strip file-filter-strip" aria-label="文件筛选">
        <input
          aria-label="搜索文件名"
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="搜索文件名"
          value={filters.search}
        />
        <select
          aria-label="分类"
          onChange={(event) => updateFilter('category', event.target.value as FileCategory | '')}
          value={filters.category}
        >
          <option value="">全部分类</option>
          {options?.categories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </select>
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
          aria-label="知识点"
          onChange={(event) => updateFilter('knowledgePointId', event.target.value)}
          value={filters.knowledgePointId}
        >
          <option value="">全部知识点</option>
          {filterKnowledgePoints.map((point) => (
            <option key={point.id} value={point.id}>
              {point.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="empty-panel error-panel" role="alert">
          <h2>文件库暂时无法加载</h2>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="empty-panel">
          <h2>正在加载文件</h2>
          <p>正在读取当前机构的文件资料。</p>
        </div>
      ) : result?.items.length ? (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>分类</th>
                  <th>教学维度</th>
                  <th>大小</th>
                  <th>上传时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((file) => (
                  <tr key={file.id}>
                    <td className="file-name-cell">
                      {file.name}
                      <span className="table-secondary">{file.mimeType}</span>
                    </td>
                    <td>{categoryLabels[file.category]}</td>
                    <td>
                      {[file.subject?.name, file.grade?.name, file.region?.name]
                        .filter(Boolean)
                        .join(' / ') || '通用'}
                      <span className="table-secondary">
                        {file.knowledgePoints.map((point) => point.name).join('、') ||
                          '未关联知识点'}
                      </span>
                    </td>
                    <td>{formatSize(file.size)}</td>
                    <td>{new Date(file.createdAt).toLocaleDateString('zh-CN')}</td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => void handleDownload(file.id)}
                        type="button"
                      >
                        下载
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination" aria-label="文件库分页">
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
          <h2>还没有符合条件的文件</h2>
          <p>上传首份资料，或调整筛选条件后重试。</p>
        </div>
      )}
    </>
  );
}
