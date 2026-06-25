# 项目 Backlog

> 说明：Codex GitHub connector 当前可以读取仓库，但创建 Issues 返回 403。因此先把第一版 backlog 落在仓库中；后续补齐 GitHub Issues 权限或安装 `gh` 后，可按本文件逐条导入 GitHub Issues / Project。

## P0 工程基础

### [工程] 完善 monorepo 基础工程

- 目标：补齐 pnpm workspace 下的 TypeScript、ESLint、Prettier、基础脚本和 CI 执行入口。
- 验收标准：
  - 根目录包含统一的 tsconfig、ESLint、Prettier 配置。
  - `apps/*` 与 `packages/*` 可以复用基础配置。
  - 根目录脚本覆盖 `dev`、`lint`、`typecheck`、`test`、`format`。
  - GitHub Actions 使用 pnpm 安装依赖并执行 lint/typecheck/test。

### [Web] 初始化 Next.js 后台框架与页面壳子

- 目标：初始化 `apps/web`，搭建教务后台的基础路由与布局。
- 验收标准：
  - 使用 Next.js + React + TypeScript。
  - 提供登录页、仪表盘、题库、讲义、课表、学生档案、文件库页面壳子。
  - 有统一导航、基础样式和空状态。
  - 能通过 `pnpm --filter web dev` 启动。

### [API] 初始化 NestJS 后端框架与 health 接口

- 目标：初始化 `apps/api`，建立后端模块化结构和健康检查接口。
- 验收标准：
  - 使用 NestJS + TypeScript。
  - 提供 `/health` 接口，返回服务状态、版本和时间。
  - 建立 auth、users、questions、files、timetable、students 模块目录。
  - 能通过 `pnpm --filter api dev` 启动。

### [DB] 设计 Prisma 数据模型与迁移基线

- 目标：设计平台核心数据模型并接入 Prisma。
- 验收标准：
  - 覆盖 User、Teacher、Student、Subject、Grade、Region、KnowledgePoint、Paper、Question、FileAsset、Timetable、Lesson、StudentProfile、Mistake。
  - 支持机构、角色、学科、年级、天津区域等基础维度。
  - 提供首个 migration 和 seed 入口。
  - `.env.example` 包含数据库连接示例。

## P1 MVP 功能

### [Auth] 登录与 RBAC 权限

- 目标：实现后台登录、用户角色和权限控制。
- 验收标准：
  - 支持管理员、教务、教师、学生等角色。
  - API 有登录、当前用户、退出或 token 刷新接口。
  - Web 端根据角色展示对应导航与页面权限。

### [题库] 实现题库 MVP

- 目标：实现天津九大学科题库的基础录入、筛选与列表。
- 验收标准：
  - 支持学科、年级、年份、区域、试卷类型、知识点筛选。
  - 支持题目列表、题目详情、难度和来源字段。
  - 预留组卷和相似题推荐扩展点。

### [文件库] 实现试卷/讲义上传下载

- 目标：建立机构文件沉淀能力。
- 验收标准：
  - 支持上传、下载、预览元数据和分类管理。
  - 文件关联学科、年级、区域、知识点、类型。
  - 开发期支持本地或 MinIO，正式环境可切换对象存储。

### [课表] 实现排课与课节管理

- 目标：实现班课、一对一、教师和教室维度的课表基础版。
- 验收标准：
  - 支持课程、课节、教师、学生、教室、时间段。
  - Web 端提供周视图和列表视图。
  - 支持冲突提示的数据结构预留。

### [学生档案] 教师端一生一案

- 目标：为教师端提供学生学习档案。
- 验收标准：
  - 展示学生基本信息、课程记录、测试记录、薄弱知识点。
  - 支持教师记录学习建议和跟进事项。
  - 能关联错题、课表和讲义。

### [错题本] 学生端错题本 MVP

- 目标：为学生端建立错题沉淀与复习入口。
- 验收标准：
  - 支持按学科、知识点、时间、掌握状态筛选错题。
  - 支持错题解析、订正记录和复习状态。
  - 预留 OCR 导入和相似题推荐入口。

### [讲义] 讲义制作流程 MVP

- 目标：支持老师基于教材、自有资料和题库生成讲义。
- 验收标准：
  - 支持选择学科、年级、知识点和题型。
  - 支持讲义草稿、预览和导出字段设计。
  - 可关联文件库素材和题库题目。

## P2 智能分析与部署

### [AI] OCR、错题分析和个性化学习报告规划

- 目标：规划后置智能能力的服务边界与数据流。
- 验收标准：
  - 明确 OCR、错题识别、向量检索、相似题推荐、学习报告的数据输入输出。
  - 评估 Python/FastAPI 服务与主 API 的集成方式。
  - 明确人工审核和隐私合规要求。

### [DevOps] 本地开发环境与部署基线

- 目标：补齐本地开发、测试和上线准备。
- 验收标准：
  - 文档列出 Node.js LTS、pnpm、GitHub CLI、Docker Desktop、PostgreSQL/Redis、微信开发者工具。
  - 提供 Docker Compose 草案。
  - 规划开发、测试、正式环境变量和部署流程。
