# 天津教辅平台

面向天津市初高中教辅机构的题库、讲义、课表、教师端和学生端一体化平台。

## 目标

- 建立天津九大学科题库，支持按学科、年份、区域、试卷类型筛选。
- 支持知识点专项组题、试卷上传下载和机构资料沉淀。
- 建立讲义制作流程，整合电子教材、老师自有文档和配套题型。
- 提供课表系统、教师端一生一案、学生端错题本。
- 后续接入 OCR、错题分析、相似题推荐和个性化学习报告。

## 仓库结构

```text
apps/
  web/       # 网站后台，使用 Next.js
  api/       # 后端接口，使用 NestJS
  miniapp/   # 学生端/教师端小程序，计划使用 Taro
packages/
  shared/    # 公共类型、常量和工具
docs/        # 需求、架构、接口和部署文档
.github/     # GitHub Actions、Issue 模板、PR 模板
```

## 技术路线

- 前端后台：Next.js + React + TypeScript
- 后端服务：NestJS + TypeScript + Prisma
- 数据库：PostgreSQL
- 缓存/队列：Redis + BullMQ
- 小程序：Taro + React
- 文件存储：开发期 MinIO，正式环境腾讯云 COS 或阿里云 OSS
- 智能分析：Python/FastAPI + OCR + 大模型 API + 向量检索

## 当前已实现

### 工程基础

- 已启用 pnpm workspace，覆盖 `apps/*` 和 `packages/*`。
- 已配置统一的 TypeScript、ESLint、Prettier 和根目录脚本。
- 已生成 `pnpm-lock.yaml`，便于 CI 和本地环境锁定依赖版本。
- 已补充 backlog 文档，见 `docs/backlog.md`。

### Web 后台

- 已初始化 `apps/web` Next.js + React + TypeScript 后台框架。
- 已提供登录页、仪表盘、题库、讲义、课表、学生档案、文件库页面壳子。
- 已提供统一侧边导航、基础视觉样式、空状态和示例数据。
- 题库筛选已复用公共包中的天津学科和区域常量。

### API 服务

- 已初始化 `apps/api` NestJS + TypeScript 后端框架。
- 已提供 `GET /health` 健康检查接口。
- 已建立 auth、users、questions、files、timetable、students 模块目录。
- 已接入 Prisma 7、PostgreSQL 驱动适配器和 NestJS 全局数据库模块。
- 已配置 CORS，支持从 Web 后台访问 API。

### 数据库与本地环境

- 已建立机构、用户、教师、学生、学科、年级、天津区域和知识点核心模型。
- 已为题库、试卷、文件、课表、学生档案和错题本建立数据模型及关联表。
- 已提供首个 PostgreSQL 迁移和可重复执行的 seed，初始化九大学科、六个年级、天津 16 个区和示例知识点。
- 已提供 Docker Compose 草案，可在本地启动 PostgreSQL 16 和 Redis 7。
- 本地环境、数据库命令和部署约定见 `docs/local-development.md`。

### 公共包

- 已初始化 `packages/shared` 公共包。
- 已提供天津九大学科、天津区域、用户角色和健康检查相关类型。

## 开发阶段

1. 搭建仓库、任务模板、CI 和基础目录。
2. 实现登录权限、题库筛选、文件上传下载、课表和学生档案基础版。
3. 实现讲义制作、知识点组题、错题本和教师端一生一案。
4. 接入 OCR、试卷/错题分析、相似题推荐和个性化学习报告。

## 本地开发

安装 Node.js LTS、pnpm 和 Docker Desktop 后执行：

```bash
corepack enable
cp .env.example .env
pnpm install
docker compose up -d
pnpm --filter api db:migrate:deploy
pnpm --filter api db:seed
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
```

常用入口：

- `pnpm --filter web dev`：启动 Next.js 后台，默认端口 3000。
- `pnpm --filter api dev`：启动 NestJS API，默认端口 4000。
- `pnpm --filter api db:migrate`：开发新模型时创建并应用迁移。
- `pnpm --filter api db:seed`：写入本地基础数据，可重复执行。
- `docker compose down`：停止本地 PostgreSQL 和 Redis，保留数据卷。
- `GET http://localhost:4000/health`：API 健康检查。

Windows PowerShell 可使用 `Copy-Item .env.example .env` 复制环境变量文件。完整说明见 `docs/local-development.md`，当前 backlog 见 `docs/backlog.md`。

## 文档维护约定

后续每个实现功能或调整用户可见能力的 PR，都需要同步更新 README 的“当前已实现”部分。若 PR 只修改内部工程配置、CI、依赖或文档，也需要在 PR 描述中说明 README 是否需要更新。
