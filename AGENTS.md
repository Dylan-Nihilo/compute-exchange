# OmniS Frontend — Agent Guide

本仓库是 OmniS 的 Next.js 前端，远端为 `Dylan-Nihilo/compute-exchange`。它通过目录链接出现在 `omnis-workspace/frontend/`，与 Go 后端 `NecoLiang/AI-Compute-Platform-` 保持独立 Git 历史和发布链路。**本文件中的路径和命令以当前前端仓库为根。**

## 开始工作

- 先检查 `git status -sb`、`git remote -v` 和当前分支；保留用户的未提交文件。若通过 OmniS workspace 工作，同时阅读根目录的 AGENTS.md / CONTEXT.md。
- 本仓库 README 的“全部 Mock／原型阶段”属于历史描述，不能据此判断当前实现。按 adapter、BFF、后端契约和运行结果确认每个功能的数据来源。
- 前端任务只修改本仓库。需要变更 Go API 时明确跨端范围，在后端独立提交，不把 Go 业务逻辑搬进 Next.js。
- 默认中文沟通；代码标识、命令和新增注释使用英文，已有文件的约定优先。先说明结果，区分代码存在、测试通过、已发布和真实服务可用。

## 启动与环境

- 技术基线：Next.js 15 App Router、React 19、TypeScript、Tailwind v4、HeroUI v3 / Pro；精确版本以 `package.json` 和 `pnpm-lock.yaml` 为准。
- Node.js >= 22，使用 `package.json` 的 pnpm 版本。缺少依赖时执行 `pnpm install --frozen-lockfile`，不要换包管理器或重写锁文件。
- 环境模板为 `.env.example`，本地配置为 `.env.local`；仅在文件不存在时从模板创建，不能覆盖已有配置或输出密钥值。
- HeroUI Pro 的安装/校验入口是 `pnpm heroui:setup`。仅在依赖缺失或需重装时运行；`HEROUI_KEY` 从本地配置或 CI Secret 注入，MCP 文档访问不等于 npm 包已安装。

```bash
pnpm dev
```

地址为 http://localhost:3000，市场为 http://localhost:3000/market。启动前检查现有进程和端口；`pnpm dev` 先运行 `auth:up`，通过 `deploy/cap.compose.yml` 启动 Cap，再用 `scripts/check-local-auth.mjs` 检查 Cap 与独立 Go 后端。它不会替你启动 Go 服务。

| 配置 | 用途 / 本地默认 |
|---|---|
| `AUTH_API_BASE_URL` | BFF 服务端访问 Go API，`http://127.0.0.1:8080/api/v1` |
| `BACKEND_ORIGIN` | `next.config.mjs` 对同源 `/api/v1/*` 的代理目标，`http://127.0.0.1:8080` |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器公共 API 配置；本地沿用现有同源代理，不改成生产写入目标 |
| `NEXT_PUBLIC_CAP_API_ENDPOINT` | `http://127.0.0.1:3210/local-dev/` |

开发构建输出为 `.next-dev`，生产构建为 `.next`，由 `next.config.mjs` 区分。不要为修复开发环境随意删除缓存、停止其他项目或重建后端。

## 代码入口

| 领域 | 入口 |
|---|---|
| 路由与页面 | `src/app/`；公开站点 `(portal)` / `(landing)`，市场 `market`，工作台 `console`，运营 `admin` |
| 角色、导航和访问入口 | `src/lib/domain/routes.ts`、`src/middleware.ts`；服务端仍须校验权限 |
| 通用 HTTP / schema | `src/lib/api/client.ts`、`src/lib/config/`、对应领域 adapter |
| 会话、BFF、文件代理 | `src/lib/api/auth-backend.ts`、`src/app/api/` |
| 登录、注册、KYC | `src/lib/auth/`、`src/components/auth/` |
| 市场、发布与下单 | `src/lib/market-api.ts`、`src/lib/supplier-workspace.ts`、`src/components/workspace/supplier/product-form.tsx`、`src/app/checkout/` |
| 买家订单 / 发票 | `src/lib/buyer-orders.ts`、`src/lib/buyer-invoices.ts`、`src/app/api/buyer/` |
| GPU 型号及图标 | `src/lib/gpu-catalog.ts`、`public/brand/vendors/SOURCES.md` |
| 协议正文与版本 | `src/components/legal/`、`src/lib/legal.ts`、`docs/api/legal-consent-api.md` |
| 设计约定与样式 | `.impeccable.md`、`src/app/globals.css`、现有共享组件 |

## 接口与产品约束

- 先复用现有 adapter、Zod schema、格式化函数和组件；不要为一个调用新建通用框架、依赖或重复请求封装。
- 浏览器以同源 BFF/公共 API 访问服务。会话写入 HttpOnly Cookie，不把 access/refresh token 放入 localStorage 或页面脚本。
- 认证代理复用 `proxyAuthenticatedBackend`；文件/PDF 代理复用 `proxyAuthenticatedBackendRaw`，保留刷新会话、错误 envelope 和响应头处理。
- 同时处理 HTTP 状态和 JSON `code`。真实业务失败不得悄悄回退到 Mock 成功；空数据、加载、错误和未开放功能应明确区分。
- 注册为手机号验证码流程，成功响应直接建立会话，不要求再登录或立即完成 KYC。后续业务权限依靠实际角色/KYC 状态。
- 协议四个独立公开路由为 `/terms`、`/privacy`、`/resource-listing-rules`、`/resource-usage-rules`。表单携带当前版本；BFF 只转发，不替用户补造版本或同意。
- 同意默认不勾选；打开协议保留表单、不触发勾选；KYC 敏感信息处理有独立告知和单独同意。更改正文先归档并提供旧版本入口，再同步更新 Go 端版本。
- 微信是否展示可用入口依据后端能力状态；配置缺失不能假装授权成功。KYC 持久化不等于真实核验，订单创建也不等于支付完成。
- 视觉修改先读 `.impeccable.md` 并遵循用户最新要求，复用语义 token。页面只展示帮助用户完成任务的文案，禁止把设计理由、审计结果、实现提示放进产品页面。
- 保持键盘操作、可见焦点、表单标签、错误反馈及小屏可用性；涉及移动端时检查底部安全区域。不能以静态截图代替实际交互验证。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# Full sequence:
pnpm check
```

- 测试使用 Node 原生 test runner；按已有 `*.test.ts` 组织，用最小回归覆盖真实边界。服务契约改动核对对应 `docs/api/`、Go handler/DTO、Swagger 与服务端测试。
- 交互改动在浏览器实际操作对应路径，覆盖错误/空态和必要的移动宽度。认证与下单需要检查 BFF/API 结果；模拟上游测试与真实联调分别报告。
- 纯 AGENTS.md 等文档修改检查路径、脚本名称、内容与 `git diff --check` 即可，不为此启动服务或重跑全套构建。

## 提交与发布

- 只 stage 已核对的前端文件，独立提交；不带入 `.env.local`、HeroUI 密钥、会话、测试账号或身份材料。
- push 前 fetch 并核对远端、目标分支、待推送范围及 `.github/workflows/ci.yml`。**main 上任何 push（含文档）会触发质量检查、GHCR 镜像发布和生产部署；PR 只执行质量检查。**
- 仅同步文档且未授权发布时，推送明确的文档分支，不通过 main 顺带部署。前端授权不能扩张为后端发布或数据库迁移。
- 生产入口 https://omnisline.com；发布文件为 `deploy/compose.yml`、`deploy/Caddyfile`、`deploy/deploy.sh`，仅更新前端/Caddy，保留后端、数据库和 Cap。
- 发布后核对 CI、提交 SHA、镜像 revision、容器健康和实际页面/API。根 workspace 没有远端不是本仓库 push 的阻塞原因。

## 当前功能边界 — 2026-09-07

已发布业务版本 `55e08dd` 包含协议页面、GPU 型号接入与图标；对应 CI 145 项测试通过。协议版本 `2026-09-06.1`，电话按用户要求后补。后端同意留痕与微信实现仍待迁移/发布，真实支付及外部 KYC 未接入；继续工作时重新核对这些状态，不把本段作为操作授权。
