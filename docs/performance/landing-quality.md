# Landing 首屏优化：保留原视频质量

本轮只修改前端，保留现有布局、业务文案和视频。生产部署需要另行执行，本报告中的性能对照来自本地生产构建与受控网络。

## 视频与字体

- Hero 视频仍为 `hero-motion-4k-88aaafcc.mp4`：3840×2160、60fps、H.264、4.516667 秒、7,423,850 字节。未重新编码、降分辨率或降帧率；桌面和手机使用相同原片。
- SHA-256：`6169a56d037d7e8b914257b76bb6d7d654b17c4cd78cb671b08fca90a63acab6`，与优化前文件完全相同。
- 品牌字体保留 500 / 600 字重，仅对子集使用独立的 `OmniS Landing` 字体族。两文件共 76,972 字节；335 + 328 个字形的轮廓和 advance width 已与原字体逐一比对，一致。
- 原字体和视频资产保留。字体内的版权/name 元数据保留；子集以源字体原有授权为前提，不增加或改变字体授权。Landing 以外的字体设置不变，子集之外字符回退系统字体。

移除了 Hero 全屏等待层、媒体就绪事件及对应样式；正文、搜索和 CTA 不等待视频。CTA 使用现有按钮样式的原生链接，搜索保留原生表单 action。阻断外部应用 JavaScript 时，首屏正文可见且 CTA 仍可导航；Next.js 流式页面自身仍使用内联脚本，本轮不承诺完全禁用所有 JavaScript 的全站功能。

背景图就绪后（图片挂起时最多等 2 秒）后台完整下载原片，再由原生 video 播放并在首个视频帧后淡入。后台准备上限为 20 秒，失败、播放被拒绝或超时保留背景图；不阻挡正文。reduced-motion 或明确省流量模式不请求 Hero 视频；离页取消请求并释放 Blob URL，后台暂停、恢复后继续播放。

采用完整缓冲是为当前约 4.5 秒 / 7.42 MB 短循环避免可见播放再缓冲。长视频不应继续沿用该策略。首帧检测优先用 [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)，旧浏览器依据播放进度与当前帧就绪状态回退；卸载时[释放 Blob URL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)。

## 性能对照

基线为 `c1b3640`。同一台 Mac、Chrome 152，1440×900、DPR 1；两个本地 production server，CDP 固定 6 Mbps 下行与 100ms latency，无 CPU 限速。每轮新浏览器上下文并清除/禁用浏览器缓存、禁用 Service Worker。5 轮基线 / 5 轮候选；仅统计 HTTP(S)，均零缓存命中。首个基线样本与功能检查有短暂重叠，其数值未超出其他基线样本范围，报告保留所有样本。

视频稳定起点以可见后的连续 10 秒为窗口：无 ≥100ms 再缓冲、无 ≥500ms 帧停顿、掉帧率 ≤1%。额外 10 秒确认期不计入用户等待时间。总传输量统计到确认结束，包含路由预取，不把 Blob 请求误当作零字节视频。

| 指标 | 基线 | 最终候选 |
|---|---:|---:|
| 正文可见，中位数 | 4.82 s | 0.81 s |
| 正文可见，最慢 | 5.02 s | 0.81 s |
| 视频稳定播放，中位数 | 21.42 s | 11.81 s |
| 视频稳定播放，最慢 | 21.42 s | 11.82 s |
| 总传输量，中位数 | 15.79 MB | 8.33 MB |
| 可见后的 ≥100ms 再缓冲 | 每轮 25 次 | 每轮 0 次 |
| 稳定窗口帧率 | 59.3–59.6 fps | 59.7–59.9 fps |
| 稳定窗口掉帧率 | <1% | ≤0.51% |

| 轮次 | 基线正文 / 稳定视频 | 候选正文 / 稳定视频 |
|---|---:|---:|
| 1 | 5.018 / 21.419 s | 0.814 / 11.815 s |
| 2 | 4.811 / 21.412 s | 0.811 / 11.813 s |
| 3 | 4.818 / 21.420 s | 0.811 / 11.812 s |
| 4 | 4.817 / 21.420 s | 0.812 / 11.813 s |
| 5 | 4.813 / 21.313 s | 0.811 / 11.813 s |

海报 2 秒兜底加入后的最终构建另补测一轮：正文 0.815 秒、稳定视频 11.916 秒、8.333 MB，稳定窗口 0 掉帧；完整浏览器回归再次通过。

生产链路重新测得原版约 22 秒进入稳定播放，但不能把 localhost 的受控候选结果当作已经上线的公网收益。

额外检查：1 Mbps / 150ms 下正文约 4.13 秒可见，视频准备超时后确认取消下载、保留静态背景，市场导航正常。新的持久化 Chrome 配置中，第二次访问的原视频命中磁盘缓存；无痕上下文未缓存该大文件，不能保证所有浏览模式重复访问都零传输。

保留 7.42 MB 原片后，不再采用原方案“首屏总量 ≤3 MB、视频 ≤4 秒”的小视频目标。若希望原画也在数秒内完成冷加载，后续应实测静态资源交付吞吐与 CDN；本轮未变更 CDN、域名、源站配置或生产环境。

## 可复现检查

`pnpm check` 已通过：146 项测试、类型检查和 production build 成功；现有库存页的两条 `<img>` lint warning 保留。字体子集重生成校验及视频 SHA 比对通过。

```sh
pnpm check
uv run --with 'fonttools[woff]==4.56.0' python scripts/subset-landing-fonts.py --check
# Rebuild subsets after Landing copy changes:
uv run --with 'fonttools[woff]==4.56.0' python scripts/subset-landing-fonts.py
# Against a running production build; use an existing Playwright installation:
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/check-landing.mjs http://127.0.0.1:3101
```

字体脚本从 Landing 源码提取字形，保留轮廓、hinting 和版权元数据，输出内容哈希文件名与局部 CSS；字体缓存为一年 immutable。它依赖离线生成工具 fontTools/WOFF2，不增加前端运行时依赖。[fontTools 子集参数](https://fonttools.readthedocs.io/en/latest/subset/index.html)。

浏览器回归覆盖桌面/手机视口、单一原片请求、完整缓冲后显示、重复进入、切换 reduced-motion、省流量、视频 404、自动播放拒绝、字体/背景图失败、背景图挂起、首帧 API 回退、真实 20 秒超时、下载未完离页，以及搜索和市场导航。真实 iOS / Safari 设备与发布后的公网冷启动仍需补测；不将桌面 Chrome 的手机视口等同于真机。

发布前重查生产镜像、目标分支和 CI。当前 main push 自动部署，发布后须核对镜像 SHA、页面/API、字体缓存头及公网冷加载。回滚使用当时记录的前端旧镜像；后端与数据库不参与本轮发布。
