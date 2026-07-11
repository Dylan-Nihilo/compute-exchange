# Compute Exchange

算力撮合交易平台与 AI Token 工厂。当前仓库只包含基础技术架构，不包含业务模块。

## 技术基线

- Next.js 15 App Router + React 19 + TypeScript strict
- Tailwind CSS v4 + HeroUI v3 / HeroUI Pro
- TanStack Query 管理服务端状态
- Zustand 管理后续模块的客户端状态
- Zod 校验环境配置与后续 API 边界

## 本地启动

HeroUI Pro 使用本地授权密钥，密钥不得提交到 Git。

```bash
pnpm install --ignore-scripts
cp .env.example .env.local
# Fill HEROUI_KEY in .env.local
pnpm heroui:setup
pnpm dev
```

开发服务默认运行在 <http://localhost:3000>。

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
