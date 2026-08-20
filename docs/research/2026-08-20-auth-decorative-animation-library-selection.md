# 登录页装饰动效方案选型（2026-08-20）

## 结论

**本轮推荐采用 `@paper-design/shaders-react@0.0.80` 的 `MeshGradient`，用现有 `motion` 的 `useReducedMotion()` 控制 `speed={0}` 降级。**

原因不是 Paper Shaders 的 API 比 Motion 更好，而是两者解决的问题不同：当前难看主要是视觉素材本身不足，`motion` 只能把手写的 DOM 形状移动得更顺，无法自动生成有连续细节、没有明显边界的抽象材质；Paper Shaders 已提供可调的 WebGL2 流体渐变，正好覆盖“纯装饰、无业务含义、克制、有生命感”的需求。

建议不要以“中央物体”为主角，而是让低对比度 `MeshGradient` 铺满左侧背景：使用浅灰蓝底、品牌蓝与雾白，极少量冷青作为过渡；动画速度控制在 `0.06–0.12`，降低 distortion/swirl，并在内容上方保留一层浅色雾化遮罩。这样视觉是环境氛围，不会再次变成一个需要解释的图形。

## 当前项目约束

- Next.js `15.5.20`、React `19.2.7`、App Router。
- 已安装 `motion@12.42.2`，项目多个 landing 组件已经在使用；登录页目前是手写 CSS keyframes。
- 登录页左侧只在桌面断点展示，适合把 WebGL 渲染限制在一个固定区域。
- HeroUI Pro 继续负责界面组件；背景动效不是表单控件，不需要强行由 HeroUI Pro 提供。

## 方案比较

| 方案 | React 19 / Next.js 15 | 运行与交付成本 | 外部设计资产 | Reduced motion | 许可 | 本项目判断 |
| --- | --- | --- | --- | --- | --- | --- |
| **现有 Motion** | 官方支持 React `18.2+`，同时支持 Next.js Pages/App Router；App Router 可用 `motion/react-client` | DOM/WAAPI 成本低；官方给出的 `useReducedMotion` 约 1 kB、mini `useAnimate` 2.3 kB；但复杂视觉仍要自己画 | 不需要 | 原生 `useReducedMotion` / `MotionConfig` | MIT | **保留做编排和无障碍，不再承担主视觉生成** |
| **Paper Shaders** | React 包 peer 覆盖 React 18/19；官方 changelog 已加入 `"use client"` 并改善 RSC/SSR | WebGL2、持续 rAF；零运行依赖，离屏自动暂停，可用 `maxPixelCount` 限制像素量 | 不需要 | 没有自动媒体查询；官方支持 `speed=0` 停止循环，结合现有 Motion hook 即可 | `0.0.80` 为 Apache-2.0 | **本轮首选：直接提升抽象背景质感，接入面小** |
| **Rive React** | 官方 wrapper 支持 React `^16.8` 到 `^19`；基于 canvas/WebGL2/Canvas runtime，建议客户端隔离 | JS/WASM + canvas；暂停后资源消耗很低，但运行时明显重于 DOM 动画 | **需要 `.riv` 文件和 Rive 设计/导出流程** | 官方建议读取用户设置后 `pause()` 或 `autoplay:false` | Runtime MIT | **设计师以后交付 bespoke 动效时首选，现在缺资产** |
| **dotLottie React** | React peer 覆盖 17/18/19；官方矩阵标记 React player SSR compatible | Canvas/ThorVG，适合已完成的二维矢量动画；播放器与动画文件均需加载 | **需要 `.lottie` 或 Lottie JSON** | 无自动策略；通过 `autoplay` 和 player 的 `pause()` 手动处理 | MIT | **有 AE/Lottie 成品后可用，现在不会自动解决视觉设计** |
| **tsParticles** | 官方有 React 与 Next.js wrapper；React wrapper 在 `useEffect` 中初始化 engine | Canvas 粒子引擎；可只加载 `basic/slim`，但配置项与运行循环仍多 | 不需要 | 官方 `motion` 配置直接尊重 `prefers-reduced-motion` | MIT | **不选：容易形成通用“科技粒子/连线”风格，与克制 B2B 不符** |
| **R3F + three** | R3F v9 是 React 19 兼容版；Next.js 中仍应客户端渲染 Canvas | 完整 3D 场景、WebGL render loop、依赖面最大；可用 `frameloop="demand"` 静态降级 | 程序化场景可不需要，但高质量通常需要模型/贴图/材质 | 无自动策略，需自行切换 frameloop/卸载 | MIT | **不选：一个登录页氛围图不值得引入 3D 引擎** |
| **OGL / React Bits** | OGL 是浏览器 WebGL 库；React Bits 背景组件使用 `useEffect` + rAF，Next 中需客户端组件 | OGL 全量官方口径 29 kB minzipped、零依赖；React Bits 是复制源码并维护 GLSL | 不需要 | 抽查 Aurora、Threads、Iridescence、Orb 源码均未内置媒体查询，需自行补 | OGL Unlicense；React Bits MIT + Commons Clause | **可作为备选灵感，不优先复制第三方 shader 源码** |

> 包大小需要区分：Motion/OGL 的数字是各官方给出的构建口径；npm 的 `dist.unpackedSize` 只是安装包展开体积，不等于浏览器最终下载量。本次不使用第三方 bundle size 估算站点作为证据。

## 为什么首选 Paper Shaders

### 兼容与维护边界

当前 `@paper-design/shaders-react@0.0.80` 在 npm 声明：

- peer dependency 为 React `^18 || ^19`；
- 唯一 dependency 是同版本 `@paper-design/shaders`；底层包无 dependency；
- 两个包均标记 `sideEffects: false`，可由 Next.js 构建器 tree-shake；
- React wrapper 的展开体积约 427 kB、核心约 854 kB。该数字是 npm 分发体积，不是最终 route chunk；
- 官方 changelog 记录 v0.0.45 加入 `"use client"` 并改善 RSC/SSR，v0.0.78 增加离开 viewport 后自动暂停动画循环。

项目仍需把动效封装在很小的 client component 中；SSR 只输出容器，canvas 在 hydration 后工作。WebGL 不应进入登录表单状态或鉴权调用链。

### License 已发生变化

旧版官方文档仍可能显示 PolyForm Shield，但当前 npm `0.0.80` 标注 Apache-2.0，官方 changelog 明确记录 **v0.0.77 已改为 Apache License 2.0，并随包分发 `LICENSE` 与 `NOTICE`**。实施时应：

1. 精确锁定 `0.0.80`，不使用 `^` 或 `~`；官方也提示 `0.0.x` 阶段仍可能有 breaking changes。
2. 以安装包内 `LICENSE` / `NOTICE` 为当前版本许可依据，并保留 NOTICE。

### 性能与无障碍

`MeshGradient` 是持续 WebGL2 渲染，不应因为“zero dependency”就当成零成本。建议：

- `speed` 只取 `0.06–0.12`，避免明显流动；
- 设置合理的 `maxPixelCount`，不按设备的最高 DPR 无限放大；
- 左侧不可见或页面进入后台时依赖库的离屏暂停，并在浏览器性能面板确认；
- `useReducedMotion() === true` 时传 `speed={0}`，保留同一帧的静态渐变；官方说明 `speed=0` 会停止 recurring rAF；
- 保留纯 CSS 浅灰蓝作为 WebGL2 不可用/首帧前 fallback。

## 推荐的首版视觉参数方向

- 组件：`MeshGradient`，而不是 GrainGradient、GodRays、粒子或 3D 球体。
- 色板：`#edf4f7` / `#f7fafb` 为大底，`#24476d` 仅低强度出现，辅以 `#8fb8ca` 和雾白；如保留品牌青绿，面积与饱和度都应非常低。
- 动态：大尺度、慢速、非交互；不追随鼠标，不做中心聚焦，不使用发光粒子。
- 构图：渐变覆盖左侧面板全高，在靠近表单的一侧逐渐淡出；Logo 与欢迎文案保持静止。
- 验收：同时看静止首帧、10 秒运动轨迹、低端设备帧率与 `prefers-reduced-motion: reduce`，不能只截一张图判断。

## 何时改用其他方案

- 设计师交付了专属 `.riv`：改用 Rive，能获得最稳定的品牌造型和状态机控制。
- 设计师交付了 `.lottie` / JSON：用 dotLottie，适合非交互二维循环。
- 需要真正的空间镜头、光照、材质或可交互 3D：才升级到 R3F/three。
- 只需要 DOM 元素淡入、视差或 hover：继续用现有 Motion，不安装新视觉运行时。

## 一手来源

- Motion：[Next.js / React 安装](https://motion.dev/docs/react-installation) · [Bundle size](https://motion.dev/docs/react-reduce-bundle-size) · [MotionConfig reducedMotion](https://motion.dev/docs/react-motion-config) · [GitHub / MIT](https://github.com/motiondivision/motion)
- Paper Shaders：[官方站与效果目录](https://shaders.paper.design/) · [Mesh Gradient API](https://shaders.paper.design/mesh-gradient) · [npm React package](https://www.npmjs.com/package/@paper-design/shaders-react) · [官方 changelog](https://github.com/paper-design/shaders/blob/main/CHANGELOG.md)
- Rive：[React runtime](https://rive.app/docs/runtimes/react/react) · [Runtime best practices / reduced motion](https://rive.app/docs/getting-started/best-practices) · [GitHub / React 版本与 MIT](https://github.com/rive-app/rive-react)
- LottieFiles：[dotLottie players](https://developers.lottiefiles.com/docs/) · [dotLottie web GitHub / MIT](https://github.com/LottieFiles/dotlottie-web) · [npm React package](https://www.npmjs.com/package/@lottiefiles/dotlottie-react)
- tsParticles：[React wrapper](https://github.com/tsparticles/react) · [Reduced motion options](https://particles.js.org/docs/documents/tsParticles_Engine.Options_Motion.html) · [Next/React packages](https://github.com/tsparticles/tsparticles)
- R3F/three：[R3F v9 / React 19](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) · [Canvas frameloop](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx) · [R3F MIT](https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE) · [three.js MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
- OGL / React Bits：[OGL size, dependencies and Unlicense](https://github.com/oframe/ogl) · [React Bits source and license](https://github.com/DavidHDev/react-bits) · [React Bits catalog](https://reactbits.dev/get-started/index)
