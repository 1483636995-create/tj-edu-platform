# GitHub 仓库设置清单

目标仓库：

```text
https://github.com/1483636995-create/tj-edu-platform
```

## 创建仓库

1. 使用 `1483636995-create` 账号登录 GitHub。
2. 新建仓库，名称填写 `tj-edu-platform`。
3. Visibility 建议先选择 `Private`。
4. 不要勾选自动创建 README、`.gitignore` 或 License，本地仓库已经准备好了。

## 推送本地代码

```bash
cd C:\Users\14836\Documents\Codex\2026-06-25\du-qu\tj-edu-platform
git push -u origin main
```

## 建议开启的 GitHub 功能

- Issues: 用于记录需求、Bug 和任务。
- Projects: 用于开发看板，建议列为 Backlog、Todo、In Progress、Review、Done。
- Pull Requests: 后续功能开发走 PR 合并。
- Actions: 已准备 `.github/workflows/ci.yml`，推送后自动出现。
- Dependabot: 已准备 `.github/dependabot.yml`，用于依赖更新提醒。

## 建议的仓库设置

- Default branch: `main`
- Branch protection: 保护 `main`
- Require a pull request before merging: 开启
- Require status checks to pass before merging: 后续 CI 稳定后开启
- Delete head branches automatically: 开启
- Private vulnerability reporting: 可开启

## Secrets 预留

后续部署或接入服务时，在 GitHub repository secrets 添加：

- `DATABASE_URL`
- `REDIS_URL`
- `STORAGE_ENDPOINT`
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `OPENAI_API_KEY` 或其他大模型服务密钥
