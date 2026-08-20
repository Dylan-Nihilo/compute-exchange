# 开源验证码方案选型（2026-08-17）

## 结论

唯一推荐：[Cap](https://trycap.dev/)。它与本项目的 Next.js 15 / React 19、Go 1.26、Redis、Docker 技术栈最贴合：前端有官方 React 19 接入示例，后端通过 `siteverify` 校验单次使用 token，服务端可用 Standalone Docker + Valkey 部署。

[ALTCHA](https://altcha.org/) 仅作为轻运维备选：Go 服务可以本地校验 PoW，但必须由应用自行维护 replay registry，否则无法阻止挑战重放。

## 对比

| 方案 | 许可与成熟度 | 接入与验证 | 判断 |
| --- | --- | --- | --- |
| [Cap](https://github.com/tiagozip/cap) | Apache-2.0；`cap-widget` 0.1.57，约 20 kB | 官方 React 19 snippet；支持 programmatic mode；PoW + instrumentation；Standalone Docker + Valkey；`siteverify`；single-use token | **采用** |
| [ALTCHA](https://github.com/altcha-org/altcha) | MIT；前端约 34 kB | 官方 React example 与 [Go library](https://github.com/altcha-org/altcha-lib-go)；核心 PoW 可在 Go 内本地校验，但 replay registry 需自行实现 | 轻运维备选 |
| [mCaptcha](https://github.com/mCaptcha/mCaptcha) | AGPL；React glue 仍为 alpha | 当前 React 集成成熟度不足 | 不采用 |
| [Friendly Captcha](https://github.com/FriendlyCaptcha) | 自托管后端为非商业 source-available | 不符合本次“开源组件”筛选条件 | 不采用 |

## Cloudflare Turnstile 对比

Turnstile 可以替代当前短信/邮箱验证码发送前的人机验证，但它只验证请求是否可信，不负责发送验证码。官方提供 **Managed（推荐）**、**Non-Interactive**、**Invisible** 三种模式；其中 Managed 会按风险决定是否要求用户勾选，适合直接保护“获取验证码”接口。[Widget modes](https://developers.cloudflare.com/turnstile/concepts/widget/)

前端拿到 token 后，服务端必须调用 `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`；仅做前端验证不具备保护作用。token 生成后有效 300 秒且只能验证一次，过期或重放会返回 `timeout-or-duplicate`。[Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

免费计划包含全部 widget 类型和不限量 challenge，请求侧主要限制为每个账号最多 20 个 widget、每个 widget 最多 10 个 hostname、Analytics 最长回看 7 天，且不含 Any Hostname、Ephemeral IDs 和去品牌能力。Turnstile 可独立使用，网站无需接入 Cloudflare CDN 或经其代理。[Plans](https://developers.cloudflare.com/turnstile/plans/) · [Get started](https://developers.cloudflare.com/turnstile/get-started/)

**本项目不建议将 Turnstile 作为唯一方案：Cloudflare 官方明确说明 Turnstile 不支持中国大陆，中国大陆用户访问 China Network zone 或 global zone 均可能遇到问题。** 若主要服务中国大陆用户，应保留可在大陆稳定访问的自托管验证方案。[China Network FAQ](https://developers.cloudflare.com/china-network/faq/#is-turnstile-available-in-mainland-china)

## 接入边界

- Next.js 15 / React 19：按 Cap 官方 snippet 使用 widget；需要手动控制时采用 programmatic mode。
- Go 1.26：所有受保护接口服务端调用 `siteverify`，不信任前端结果，并依赖 single-use token 防重放。
- Docker：部署 Cap Standalone 与 Valkey；现有 Redis 不默认与验证码服务共用实例。

参考：[Cap 官方文档](https://trycap.dev/guide/) · [ALTCHA 官方文档](https://altcha.org/docs/v2/) · [mCaptcha 官方文档](https://mcaptcha.org/docs/) · [Friendly Captcha 官方站点](https://friendlycaptcha.com/)
