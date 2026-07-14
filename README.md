# Compute Exchange

算力撮合交易平台与 AI Token 工厂。当前仓库处于前端高保真原型与 Mock 数据阶段。

## 技术基线

- Next.js 15 App Router + React 19 + TypeScript strict
- Tailwind CSS v4 + HeroUI v3 + HeroUI Pro
- TanStack Query 管理服务端状态
- Zustand 管理后续模块的客户端状态
- Zod 校验环境配置与后续 API 边界

## 本地启动

```bash
cp .env.example .env.local
# Fill HEROUI_KEY in .env.local
pnpm install
pnpm heroui:setup
pnpm dev
```

开发服务默认运行在 <http://localhost:3000>。

### HeroUI Pro

当前页面直接依赖 `@heroui-pro/react`。`pnpm install` 安装依赖后，必须通过固定版本的安装器写入完整 Pro 包：

```bash
pnpm heroui:setup
```

脚本从 `.env.local` 读取 `HEROUI_KEY`，安装 Pro 依赖并验证对应 CSS。密钥不得提交到 Git。CI 使用同一命令，并要求仓库 Secret `HEROUI_KEY` 有效；缺失或失效时构建会直接失败。HeroUI Pro MCP 只提供组件文档与 API，不参与 npm 包安装。

## 质量检查

```bash
pnpm check
```

该命令依次执行 TypeScript、ESLint 和生产构建。GitHub Actions 使用同一组串行检查。

## 目录边界

- `src/app`：路由、全局加载/错误状态与运行时 Provider
- `src/lib/config`：经过校验的环境配置
- `src/lib/query`：TanStack Query 客户端策略
- `scripts/heroui`：不含密钥的 HeroUI Pro 可重复安装脚本

业务模块按单模块顺序加入；每个模块在自身边界内补齐类型、service、mock 与页面。
