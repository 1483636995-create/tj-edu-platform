'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { loading, login, user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(identifier, password);
      router.replace('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-panel">
        <h1>天津教辅平台</h1>
        <p>为初高中教辅机构集中管理题库、讲义、课表、学生档案和错题复习。</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>账号</span>
            <input
              autoComplete="username"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="邮箱、手机号、工号或学号"
              required
              value={identifier}
            />
          </label>
          <label className="field">
            <span>密码</span>
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary-button" disabled={loading || submitting} type="submit">
            {submitting ? '正在登录...' : '登录后台'}
          </button>
        </form>
      </section>
      <aside className="login-aside" aria-label="平台能力概览">
        <div className="aside-stat">
          <strong>9</strong>
          <span>天津初高中核心学科</span>
        </div>
        <div className="aside-stat">
          <strong>1</strong>
          <span>题库、讲义、课表、档案一体化入口</span>
        </div>
        <div className="aside-stat">
          <strong>AI</strong>
          <span>预留 OCR、错题分析和个性化报告能力</span>
        </div>
      </aside>
    </div>
  );
}
