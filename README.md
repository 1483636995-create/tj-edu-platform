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
- 已提供仪表盘、题库、讲义、课表、学生档案、文件库页面壳子。
- 登录页已连接真实认证 API，Token 会在本地保存并在页面加载时校验。
- 后台路由会拦截未登录访问，并根据管理员、教务、教师、学生角色控制导航和页面权限。
- 已提供统一侧边导航、基础视觉样式、空状态和示例数据。
- 题库页已连接真实 API，支持学科、年级、区域、年份、试卷类型和知识点组合筛选及分页。
- 已提供题目详情页，展示题干、难度、来源、知识点、答案、解析和关联试卷。
- 题库列表和详情已覆盖加载、空数据与错误状态。
- 文件库页已连接真实 API，支持本地文件上传、分类及教学维度筛选、分页和鉴权下载。
- 上传文件可关联学科、年级、天津区域和知识点，并覆盖上传中、成功、空数据与错误状态。

### API 服务

- 已初始化 `apps/api` NestJS + TypeScript 后端框架。
- 已提供 `GET /health` 健康检查接口。
- 已建立 auth、users、questions、files、timetable、students 模块目录。
- 已接入 Prisma 7、PostgreSQL 驱动适配器和 NestJS 全局数据库模块。
- 已提供登录、当前用户、Token 刷新和退出接口。
- 已启用全局 JWT 认证、公开路由标记、角色装饰器和 RBAC Guard。
- 已启用 DTO 白名单校验，并为认证服务和角色 Guard 添加单元测试。
- 已提供题目筛选项、分页列表、详情、创建和修改接口。
- 题库 API 支持学科、年级、区域、年份、试卷类型、知识点、题型、状态和难度筛选。
- 题库数据按公共数据与当前机构隔离，管理接口仅允许管理员、教务和教师访问。
- 已提供文件筛选项、分页列表、元数据详情、上传、下载和删除接口，单个上传文件限制为 20 MB。
- 文件 API 按当前机构隔离，并通过可替换的存储接口接入本地磁盘，为后续 MinIO 或云对象存储预留边界。
- 已配置 CORS，支持从 Web 后台访问 API。

### 数据库与本地环境

- 已建立机构、用户、教师、学生、学科、年级、天津区域和知识点核心模型。
- 已为题库、试卷、文件、课表、学生档案和错题本建立数据模型及关联表。
- 文件元数据已支持关联学科、年级、区域和多个知识点，二进制内容默认写入本地 `uploads/` 目录。
- 已提供首个 PostgreSQL 迁移和可重复执行的 seed，初始化管理员、九大学科、六个年级、天津 16 个区、示例知识点、4 份试卷和 4 道题目。
- 已提供 Docker Compose 草案，可在本地启动 PostgreSQL 16 和 Redis 7。
- 本地环境、数据库命令和部署约定见 `docs/local-development.md`。

### 公共包

- 已初始化 `packages/shared` 公共包。
- 已提供天津九大学科、天津区域、用户角色、认证会话、题库、文件库响应和健康检查相关类型。
- shared 已按标准 workspace 包输出 `dist`，供 Web 和 API 共同消费。

## 开发阶段

1. 搭建仓库、任务模板、CI 和基础目录。
2. 已实现登录权限、题库筛选和文件上传下载，继续完成课表和学生档案基础版。
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
- `GET http://localhost:4000/questions`：受保护的题库分页与筛选接口。
- `GET http://localhost:4000/files`：受保护的文件库分页与筛选接口。

Windows PowerShell 可使用 `Copy-Item .env.example .env` 复制环境变量文件。完整说明见 `docs/local-development.md`，当前 backlog 见 `docs/backlog.md`。

本地 seed 管理员默认为 `admin@tj-edu.local` / `ChangeMe123!`，仅用于开发环境，部署前必须通过环境变量替换。

## 文档维护约定

后续每个实现功能或调整用户可见能力的 PR，都需要同步更新 README 的“当前已实现”部分。若 PR 只修改内部工程配置、CI、依赖或文档，也需要在 PR 描述中说明 README 是否需要更新。
