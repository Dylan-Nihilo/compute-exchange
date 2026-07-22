# Hero 视频交付建议

## 结论

当前素材的核心瓶颈是源头：原生只有 1280×720、实际约 24fps。转码、换容器或前端加载策略可以降低首屏负担，但不能补回清晰度或运动细节；需要重新生成/取得更高分辨率、更高真实帧率的源片。

本项目的 5 秒 Hero 装饰循环，先继续用 **H.264 MP4**，配一张静态 `poster`。目标是按展示尺寸重新导出（不要先放大到伪 1440p），并让 CDN 缓存该文件。HLS 适合长视频、清晰度自适应和播放控制，不适合这个极短、静音的背景循环。

## 前端交付形状

```html
<video autoplay muted loop playsinline preload="metadata" poster="/hero-poster.webp">
  <source src="/hero.mp4" type="video/mp4; codecs=avc1.42E01E">
</video>
```

- `muted` 与 `playsinline` 是移动端自动播放的必要条件；自动播放视频会立即开始下载，`preload` 只是提示，不是流量开关。
- `poster` 负责视频尚未可播放时的首屏画面；视频应保留为 `<video>`，不要转 GIF（性能与控制能力更差）。
- 在 CSS 中使用 `object-fit: cover`，并为窄屏单独提供较小文件或静态 poster，避免下载桌面尺寸后再裁切。

## 不建议现在做的事

- **AV1 / VP9：** 可以后续做 A/B 数据测试（体积、LCP、播放失败率）后作为附加 `<source>`；Safari 的 AV1 支持取决于有硬件解码能力的设备，必须保留 H.264 fallback，不能只发 AV1。
- **AI 放大 / 补帧：** 可作为视觉制作流程的一部分，但不是前端优化；先以实际 Hero 画面和移动端测试确认是否有收益。

## 验收指标

1. 新源达到设计展示需要的原生清晰度和真实帧率。
2. Hero 首屏先稳定显示 poster，视频可播放后自然接管；关闭自动播放或弱网时仍不影响信息阅读。
3. 以真实移动网络比较 MP4 与候选 AV1/VP9 的文件大小、LCP、首帧时间和播放失败率，再决定是否增加第二编码。

## 来源

- [web.dev：Video performance](https://web.dev/learn/performance/video-performance) — 自动播放下载、`poster`、`preload` 与 GIF 替代建议。
- [WebKit：Safari 17.0 video features](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) — AV1 硬件解码限制及多 source/fallback。
- [WebKit：iOS video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/) — `muted`、`playsinline` 自动播放条件。
- [HTML Living Standard：Media](https://html.spec.whatwg.org/multipage/media.html) — `video`、`source`、`preload`、`poster` 规范。
