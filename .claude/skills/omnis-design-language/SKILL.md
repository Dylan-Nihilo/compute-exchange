---
name: omnis-design-language
description: 万象硅芯(OmniS)业务板块页的统一设计语言。新建或改版业务板块页(设备/施工/租赁/市场等)、留资流程页、编号章节式营销页时必读；定义页面骨架、设计 token、卡片/表单/侧栏规格与合规文案红线。
---

# OmniS 业务板块页设计语言

来源：融资租赁(`src/components/leads/leasing-experience.tsx` + `leasing.module.css`)与组网机电安装(`construction-experience.tsx` + `construction.module.css`)的 2026-09 重设计（PR #47/#49），是当前全站业务板块页的权威范式。新板块页直接复用这套结构与样式变量，不要另起炉灶。

## 页面骨架（自上而下，顺序固定）

1. **面包屑** `<nav aria-label="面包屑">`：`首页 / 当前板块`，12px，muted 色。
2. **Hero**（`grid 1.4fr/1fr`，右栏带 `border-left` 分隔）：
   - 左：eyebrow（12px muted 小字，如「企业设备服务」）→ `h1`（`clamp(32px,3.8vw,48px)`，600，`letter-spacing:-.045em`）→ intro（15px/1.9 muted，可 `<br className="hidden sm:block">` 控制断行）→ heroActions（主 CTA 实底 `--lease-action` 圆角 10px + 次 CTA 纯文字，锚点跳转用 `↗`/`↓` 箭头符号）。
   - 右：`assets` 清单（标题 + 图标列表，图标 19px 用 `InteractiveIcon`），移动端转为顶部横排。
3. **编号章节**：每章标题 = `<span class={sectionNumber}>01</span> + 19px/600 标题`，下接 12px muted 说明。章节 01 通常是**选择器卡片**（radio 单选或 checkbox 多选），章节 02 是**留资表单区**。
4. **留资表单区** `enquiryGrid`（`1.55fr/1fr`）：左 = `LeadCaptureForm`（白底卡），右 = **深色流程侧栏** `nextSteps`。
5. **可选扩展区**：如中登网查询 `CollateralLookup`（白卡 + 人工登记徽章 + 数据来源提示）。
6. **免责声明 footer** `disclaimer`：ShieldCheck 图标 + `服务说明` 粗体 + 11px/1.9 正文。

## 设计 token（模块内局部变量，映射全局 `cs-` token）

每个板块的 `*.module.css` 顶部在 `.page` 上定义局部变量，全部对齐：

```css
--foreground: var(--color-cs-proof-title);   /* #06253b 深墨 */
--muted: var(--color-cs-proof-text);          /* #4f6977 */
--lease-action: var(--color-cs-accent);       /* #d9f72c 荧光黄绿，主 CTA/强调 */
--lease-line: var(--color-cs-divider);        /* #dce4e8 描边 */
--lease-surface: #fff;  --lease-canvas: #f6fafb;  --lease-soft: #edf5f8;
--lease-selection: #f6fbdc;                   /* 选中卡片底色 */
--lease-ink: var(--color-cs-proof-title);
--lease-inverse: #eff7fc;  --lease-inverse-muted: #c3d4de;  /* 深色侧栏文字 */
```

页面底色 `--lease-canvas`，内容容器 `max-width:1160px; margin-inline:auto`，页面 padding `34px 24px 48px`（移动端 `26px 16px 36px`）。

## 组件规格

- **选择器卡片**（radio/checkbox 均适用）：白底、`border 1px --lease-line`、圆角 16–18px、padding ~22px；hover 描边变 ink；选中态 `data-selected="true"` → `background: --lease-selection` + `box-shadow: inset 0 0 0 1px ink`；原生 input 视觉隐藏（1px + opacity 0），焦点用 `:has(input:focus-visible) { outline: 2px solid ink; outline-offset: 4px }`；右上/右侧放圆形(radio)或方形(checkbox) checkMark，选中时填充 ink 白勾（`InteractiveIcon icon={Check} size={12}`）。卡片底部 `planBottom`：说明文字 + `tabular-nums` 序号，1px 上边线。
- **兜底选项**：卡片组下方一行「暂未确定，先沟通…」的裸 radio/checkbox（`unsure` 类，`accent-color: ink`）。
- **留资表单卡** `leadForm`：padding 28px、圆角 20px、白底、`box-shadow: 0 8px 30px -24px ink`；表头下 1px 分隔线；输入控件 `min-height 44px、圆角 10px、底色 canvas`，focus → `border ink + 白底 + 0 0 0 3px --lease-soft` 光环；提交按钮 `min-height 46px、圆角 11px、底色 --lease-action、ink 字`。成功态复用同卡片 `role="status"` + `border-top: 4px solid --lease-action`。
- **深色流程侧栏** `nextSteps`：`background: ink`、圆角 20px、padding 28px；标题行图标用 `--lease-action` 点亮；`<ol>` 三步，每步 29px 圆圈序号 + 竖向连接线（`::after` 1px，`color-mix(inverse 20%)`）；底部 `boundary` 合规边界说明（ShieldCheck + 11px）；可再加 `lookupLink`/`preparation` 引导卡（`background: color-mix(inverse 8%)`，圆角 12px）。
- **全局既有规范**（沿用，勿改）：全站输入控件基准见 `src/components/auth/identity-form.tsx` 的 `rounded-[12px] border-border bg-surface-secondary/55 … focus:ring-4 focus:ring-accent/10`；Tailwind 侧卡片 `rounded-[1.25rem]` + 静置软阴影 `shadow-[0_16px_36px_rgba(6,37,59,0.08)]`；徽章/标签 `rounded-full` 或小圆角 6–8px。

## 复用方式

- 新板块页新建 `<biz>-experience.tsx`（`"use client"`）+ `<biz>.module.css`；**共享样式直接 `import base from "./leasing.module.css"`**，本板块差异样式放自己的 module（组网机电即此做法）。
- 留资一律用共享 `LeadCaptureForm`（`src/components/leads/lead-capture-form.tsx`）：传 `leadType/source/title/subtitle/amountOptions/termOptions/disclaimer`；场景选择的值经 `intentValue` 注入，以「【意向方案】…」前缀并入 description（无独立列，合计 ≤2000 字）。
- 图标一律 lucide + `InteractiveIcon`（`src/components/system/interactive-icon`），列表图标 19px、章节辅助图标 17–23px。
- 路由页面文件只做 metadata + 渲染 experience 组件（见 `(portal)/leasing/page.tsx`）。

## 文案与合规红线

- 语气：陈述服务边界而非承诺结果。**必须**出现：① 深色侧栏 `boundary`（「提交≠审批通过/接单」）；② 页面 footer `disclaimer`（平台为信息登记与居间服务，不放贷、不担保、不承诺额度）；③ 表单下方 `disclaimer` prop（提交后如何被联系）。
- 涉金额一律「面议/以正式报价为准」；设备类明确「v1 询价撮合，不支持在线支付」。
- 板块页需登录访问：路由要加进 `src/middleware.ts` 的 `PROTECTED_ROUTES`（并确认在 route-lockdown 允许清单内），新顶级路由同时注册 `src/lib/domain/routes.ts`，否则登录后 `next` 跳转会被丢弃。

## 无障碍与响应式

- `fieldset/legend` 包选择器组；面包屑/侧栏/资产清单用 `aria-label`；状态文字用 `role="status"`。
- `@media (prefers-reduced-motion: reduce)` 关闭卡片 transition。
- 断点：767px 以下 hero 单列、planGrid 单列、enquiryGrid 单列、右栏 assets 转横排；1023px 以下多列卡片降为 2 列。
