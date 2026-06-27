# 本地开发环境

本文记录当前 monorepo 的本地依赖、数据库初始化命令和环境变量约定。

## 前置工具

- Node.js 20 LTS 或更高版本。
- 通过 Corepack 使用 pnpm 9，仓库锁定版本为 `9.15.4`。
- Git 与 GitHub CLI，用于分支、提交和 PR 协作。
- Docker Desktop，用于运行 PostgreSQL 和 Redis。
- PostgreSQL、Redis 原生客户端为可选项，日常开发不要求单独安装服务端。
- 微信开发者工具暂未接入当前工作区，开始小程序开发前再安装。

## 首次启动

macOS 或 Linux：

```bash
corepack enable
cp .env.example .env
pnpm install
docker compose up -d
pnpm --filter api db:migrate:deploy
pnpm --filter api db:seed
pnpm dev
```

Windows PowerShell 仅需将复制环境文件的命令替换为：

```powershell
Copy-Item .env.example .env
```

默认服务地址：

- Web 后台：`http://localhost:3000`
- API：`http://localhost:4000`
- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`

## 数据库命令

所有 Prisma 命令从仓库根目录执行：

```bash
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api db:migrate
pnpm --filter api db:migrate:deploy
pnpm --filter api db:seed
pnpm --filter api db:studio
```

- `db:migrate` 用于本地开发新模型，会创建并应用新的迁移。
- `db:migrate:deploy` 只应用仓库中已有迁移，适合首次启动、CI 和部署环境。
- `db:seed` 可重复执行，初始化示范机构、九大学科、六个年级、天津 16 个区和示例知识点。
- Prisma Client 由 `apps/api` 的 `postinstall` 脚本自动生成，生成目录不提交到 Git。

## Docker Compose

```bash
docker compose up -d
docker compose ps
docker compose down
```

PostgreSQL 与 Redis 使用命名数据卷。`docker compose down` 不会删除数据；只有明确需要重置本地数据时才应手动删除数据卷。

## 环境变量

- `.env.example` 保存可提交的变量名称和本地默认值。
- 本地开发使用仓库根目录 `.env`，该文件已被 Git 忽略。
- 测试、预发布和生产环境由部署平台注入变量，不在仓库保存真实密钥。
- `DATABASE_URL` 是 API 启动、Prisma 迁移和 seed 的必填项。
- 对象存储变量当前仅为后续文件库预留，接入 MinIO 或云存储时再补充具体配置。

## 部署基线

当前阶段只确定基础边界：Web 与 API 分别构建部署，PostgreSQL、Redis 和对象存储使用独立服务。部署流程应先执行 `db:migrate:deploy`，成功后再发布 API；生产环境不自动运行 seed。镜像、健康检查、备份和密钥托管将在后续 DevOps PR 中完善。
