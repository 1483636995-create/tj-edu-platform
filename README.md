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
  web/       # 网站后台，计划使用 Next.js
  api/       # 后端接口，计划使用 NestJS
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

## 开发阶段

1. 搭建仓库、任务模板、CI 和基础目录。
2. 实现登录权限、题库筛选、文件上传下载、课表和学生档案基础版。
3. 实现讲义制作、知识点组题、错题本和教师端一生一案。
4. 接入 OCR、试卷/错题分析、相似题推荐和个性化学习报告。

## 本地开发

补齐 Node.js LTS 和 pnpm 后执行：

```bash
corepack enable
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
```

常用入口：

- `pnpm --filter web dev`：启动 Next.js 后台，默认端口 3000。
- `pnpm --filter api dev`：启动 NestJS API，默认端口 4000。
- `GET http://localhost:4000/health`：API 健康检查。

当前 backlog 见 `docs/backlog.md`。
