# 天津教辅平台

面向天津市初高中教辅机构的题库、讲义、课表、教师端一生一案、学生端错题本一体化平台。

## 目标

- 建立天津初高中教辅题库，支持按学科、年份、区域、试卷类型和知识点筛选。
- 支持知识点专项组题、试卷上传下载和机构资料沉淀。
- 建立讲义制作流程，整合教材、教师自有文档和配套题型。
- 提供课表系统、教师端一生一案、学生端错题本。
- 后续接入 OCR、错题分析、相似题推荐和个性化学习报告。

## 仓库结构

```text
apps/
  web/       # Next.js Web 后台
  api/       # NestJS API
  miniapp/   # 学生端/教师端小程序，计划使用 Taro
packages/
  shared/    # 公共类型、常量和工具
docs/        # 需求、架构、接口和部署文档
.github/     # GitHub Actions、Issue 模板、PR 模板
```

## 技术路线

- Web 后台：Next.js + React + TypeScript
- API 服务：NestJS + TypeScript + Prisma
- 数据库：PostgreSQL
- 缓存/队列：Redis + BullMQ
- 小程序：Taro + React
- 文件存储：开发期本地磁盘，后续接入 MinIO 或云对象存储
- 智能分析：Python/FastAPI + OCR + 大模型 API + 向量检索

## 当前已实现

### 工程基础

- 已启用 pnpm workspace，覆盖 `apps/*` 和 `packages/*`。
- 已配置统一的 TypeScript、ESLint、Prettier 和根目录脚本。
- 已生成 `pnpm-lock.yaml`，用于 CI 和本地依赖版本锁定。
- 已补充 backlog 文档，见 `docs/backlog.md`。

### Web 后台

- 已初始化 `apps/web` Next.js + React + TypeScript 后台框架。
- 已提供统一登录页、侧边导航、仪表盘和后台基础视觉样式。
- 登录页已连接真实认证 API，Token 会在本地保存并在页面加载时校验。
- 后台路由会拦截未登录访问，并按管理员、教务、教师、学生角色控制导航和页面权限。
- 题库页已连接真实 API，支持学科、年级、区域、年份、试卷类型、知识点、题型、状态和难度筛选及分页。
- 题目详情页展示题干、难度、来源、知识点、答案、解析和关联试卷。
- 文件库页已连接真实 API，支持本地文件上传、分类、教学维度筛选、分页和鉴权下载。
- 课表页已连接真实 API，提供周视图与列表视图、周切换、教师/学科/状态筛选和课节新增编辑。
- 学生档案页已连接真实 API，提供学生筛选、详情查看、学习记录、错题本、教师备注编辑和一生一案跟进建议。
- 讲义页已连接真实 API，支持讲义草稿列表、创建编辑、选择知识点/题目/文件素材、结构预览和 Markdown 导出。
- 组题页已连接真实 API，支持按学科、年级和知识点筛题，创建/编辑练习卷草稿，维护题目顺序和总分预览。

### API 服务

- 已初始化 `apps/api` NestJS + TypeScript 后端框架。
- 已提供 `GET /health` 健康检查接口。
- 已接入 Prisma 7、PostgreSQL 驱动适配器和 NestJS 全局数据库模块。
- 已提供登录、当前用户、Token 刷新和退出接口。
- 已启用全局 JWT 认证、公开路由标记、角色装饰器和 RBAC Guard。
- 已启用 DTO 白名单校验，并为认证服务和角色 Guard 添加单元测试。
- 已提供题目筛选项、分页列表、详情、创建和修改接口。
- 已提供文件筛选项、分页列表、元数据详情、上传、下载和删除接口。
- 已提供课表筛选项、周期创建、课节列表、详情、创建和修改接口，并支持教师、教室和学生时间冲突检测。
- 已提供学生筛选项、分页列表、详情、档案备注更新、错题掌握状态更新和学生跟进洞察接口数据。
- 已提供讲义素材筛选、草稿分页列表、详情、创建、修改和 Markdown 导出接口。
- 已提供组题筛选、试卷草稿分页列表、详情、创建和修改接口，支持复用题库题目生成 `Paper`/`PaperQuestion` 结构。
- 数据访问按公共数据与当前机构隔离，管理接口仅允许管理员、教务和教师访问。
- 已形成 AI/OCR 技术方案，明确 API、智能服务、异步队列、人工审核和隐私合规边界。

### 数据库与本地环境

- 已建立机构、用户、教师、学生、学科、年级、天津区域和知识点核心模型。
- 已为题库、试卷、文件、课表、学生档案、错题本和讲义草稿建立数据模型及关联表。
- 试卷与题目通过 `PaperQuestion` 维护顺序和分值，当前组题 MVP 复用该模型保存练习卷草稿。
- 文件元数据已支持关联学科、年级、区域和多个知识点，二进制内容默认写入本地 `uploads/` 目录。
- 课节模型已覆盖课程名称、班课/一对一类型、教师、学生、学科、年级、教室、时间和状态。
- 讲义草稿模型可关联学科、年级、知识点、题库题目和文件素材。
- 已提供 PostgreSQL 迁移和可重复执行的 seed，初始化管理员、九大学科、年级、天津 16 区、示例知识点、试卷、题目、教师、学生、课表、学生档案、错题、文件素材、讲义草稿和组题草稿。
- 已提供 Docker Compose 草案，可在本地启动 PostgreSQL 16 和 Redis 7。
- 本地环境、数据库命令和部署约定见 `docs/local-development.md`。

### 公共包

- 已初始化 `packages/shared` 公共包。
- 已提供天津学科/区域、用户角色、认证会话、题库、文件库、课表、学生档案、错题本、一生一案跟进洞察、讲义草稿、讲义导出、组题草稿和健康检查相关类型。
- shared 已按标准 workspace 包输出 `dist`，供 Web 和 API 共同消费。
- 智能分析服务边界和后续落地计划见 `docs/ai-ocr-technical-plan.md`。

## 开发阶段

1. 搭建仓库、任务模板、CI 和基础目录。
2. 已实现登录权限、题库筛选、文件上传下载、课表、学生档案、错题本、讲义制作、知识点组题、讲义导出基础版和教师端一生一案跟进增强。
3. 继续实现教师端跟进任务、讲义更丰富导出格式和 AI/OCR 试卷处理。
4. 按 AI/OCR 技术方案接入 OCR、试卷/错题分析、相似题推荐和个性化学习报告。

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
- `pnpm --filter api db:migrate:deploy`：应用已有迁移。
- `pnpm --filter api db:seed`：写入本地基础数据，可重复执行。
- `docker compose down`：停止本地 PostgreSQL 和 Redis，保留数据卷。
- `GET http://localhost:4000/health`：API 健康检查。
- `GET http://localhost:4000/questions`：受保护的题库分页与筛选接口。
- `GET http://localhost:4000/papers`：受保护的组题草稿分页与筛选接口。
- `GET http://localhost:4000/files`：受保护的文件库分页与筛选接口。
- `GET http://localhost:4000/timetable/lessons`：受保护的课节列表与时间范围筛选接口。
- `GET http://localhost:4000/students`：受保护的学生档案分页与筛选接口。
- `GET http://localhost:4000/handouts`：受保护的讲义草稿分页与筛选接口。
- `GET http://localhost:4000/handouts/:id/export`：受保护的讲义 Markdown 导出接口。

Windows PowerShell 可使用 `Copy-Item .env.example .env` 复制环境变量文件。当前 backlog 见 `docs/backlog.md`。

本地 seed 管理员默认账号为 `admin@tj-edu.local` / `ChangeMe123!`，仅用于开发环境，部署前必须通过环境变量替换。

## 文档维护约定

后续每个实现功能或调整用户可见能力的 PR，都需要同步更新 README 的“当前已实现”部分。若 PR 只修改内部工程配置、CI、依赖或文档，也需要在 PR 描述中说明 README 是否需要更新。
