# 算力评估 Agent API（原「智能选型」，2026-09-28 升级）

**Base**: `http://localhost:8080/api/v1` | **Auth**: 需 `Bearer <token>`（登录用户，不限角色）

**定位（2026-09-28）**：官网首页的悬浮算力顾问入口——用户描述业务，agent 评估算力需求、
给出**可行机器方案建议**并匹配平台在售商品。市场页的传统「智能选型」按钮由前端改版时移除，
统一走首页 agent；接口路径不变（`POST /market/agent-search`）。

**口径**
- 设计见 `docs/23`：LLM 负责**算力推定**（任务需要多大显存/多少卡，推导带公式与数字）、
  **机器方案建议**（`machine_plans`，2-3 档，型号不限于平台在售）与需求解析；
  商品匹配由平台确定性打分完成 —— `matches` 里全部是平台真实在售商品，价格库存不会编造。
- 用户未明确卡数时，按 `compute_estimate.min_cards` 兜底做库存与预算校验。
- 每用户 10 次/分钟限流（42900）；需求描述 ≤500 字。
- 模型网关未配置时返回 50000 + 明确错误信息（不做规则降级）。
  生产已接入自部署 DeepSeek 网关（`deepseek-v4.1-flash`，AI_* 环境变量），实测单次评估约 5-8 秒。

**新增响应字段（2026-09-28，向后兼容）**
- `summary`：一句话评估结论（≤120 字），首页 agent 卡的标题位。
- `machine_plans[]`：可行机器方案，`{name(方案名), gpu_model, cards, nodes, per_card_vram_gb, note(一句话取舍说明)}`，
  最多 3 个、各有取舍（性价比/均衡/高性能等）；**型号不限于在售**，在售购买入口看 `matches`。
- 拒答（`relevant=false`）时二者均不下发。

**真实联调示例（2026-09-28，deepseek-v4.1-flash）**：72B INT8 在线推理 →
`summary`: "72B INT8 推理约需 94GB 显存, 并发不高, 建议 2×A100-80G 或 4×RTX 4090 起步"；
`machine_plans`: 4×RTX 4090（性价比，无 NVLink 余量紧）/ 2×A100-80G（均衡首选）/ 2×H100（高性能低延迟）。

---

## POST /market/agent-search · 智能选型 ✅

```
curl -X POST http://localhost:8080/api/v1/market/agent-search \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"我想部署一个 72B 的大模型做在线推理, INT8 量化, 并发不高, 预算每月10万以内"}'
```

**历史响应示例（2026-09-01 DeepSeek-V4-Flash 联调记录，不代表当前环境已配置）**
```json
{"code":0,"data":{
  "relevant":true,
  "analysis_steps":[
    {"title":"理解需求","detail":"您需要部署72B大模型做在线推理，使用INT8量化，并发不高，预算每月10万元以内。"},
    {"title":"算力推定","detail":"INT8推理显存需求约72B×1字节×1.3≈94GB，需至少2张80G显卡（如A100-80G或H100）。"},
    {"title":"确定筛选条件","detail":"根据显存需求，筛选80G级显卡，推荐A100-80G或H100，按月度计费，预算上限10万元/月。"}
  ],
  "compute_estimate":{
    "total_vram_gb":94,"per_card_vram_gb":80,"min_cards":2,
    "compute_class":"推理-中等规模",
    "basis":"显存≈72B×1字节(INT8)×1.3≈94GB，单卡80G需2卡"
  },
  "requirement":{"purpose":"72B 大模型在线推理","gpu_models":["A100-80G","H100"],"card_count":2,
    "pricing_mode":"monthly","duration_hint":1,"budget_fen_max":10000000,"region":""},
  "matches":[{
    "product":{"id":1,"gpu_model":"A100-80G","stock":16,"unit_price":1200000,"region":"华北-廊坊","...":"..."},
    "score":90,
    "reasons":["GPU 型号 A100-80G 符合需求","库存 16 可满足算力推定的 2 卡需求",
      "预估费用 24000.00 元在预算内","计费模式匹配(monthly)"]
  }]
}}
```

**响应（与算力无关的问题 → 拒答，不输出分析）**
```json
{"code":0,"data":{"relevant":false,"reject_reason":"该问题与算力资源采购无关","matches":[]}}
```

**响应（无匹配）**：`matches:[]` + `note:"当前在售商品中暂无满足条件的配置..."`

**前端展示建议（首页 agent，具体呈现由前端团队定）**
- 首页 agent 小窗：输入框（"描述你的业务，评估需要什么算力"）→ 提交后流式展示 `summary`
  → 完整结果到达后展开 `machine_plans` 方案（2-3 档，含取舍 note）
  → `matches` 平台在售商品卡（可直接进详情/询价）；
- `compute_estimate` 做成醒目的「算力推定卡」：总显存 / 建议卡数 / 推导依据（`basis` 带公式，是智能性的核心展示位）；
- `machine_plans` 与 `matches` 要视觉区分：前者是"建议配置"（不代表在售），后者是"平台现货"；
- 商品卡片上直接展示 `reasons`（每分都有依据，这是"智能可信"的卖点）；
- `relevant=false` 时展示 `reject_reason`，不渲染分析区。

| 错误码 | 场景 |
|---|---|
| 40001 | query 缺失/超长 |
| 42900 | 触发限流（10 次/分钟） |
| 50000 | 模型网关未配置或调用失败 |


## 前端接入与容量/预算核对（2026-09-14）

- 市场「智能选型」入口进入 `/market/agent-search`，需登录；API 实际只要求认证，不限 buyer 角色。浏览器通过同源 `/api/market/agent-search` BFF 调用，保留服务端认证、刷新会话及错误信封。
- 显式提交才调用一次，不在挂载、输入变化或失败后自动重试。需求按 Unicode codepoint 限制500字；加载期间禁用编辑和重复提交，失败保留输入，修改后清除旧结果。离开页面中止等待，结果不进入持久化存储。
- 展示实际返回的算力推定、分析步骤、结构化条件、匹配分、理由和真实商品卡；下一步由用户进入商品详情。响应为普通 JSON，不伪造流式推理进度。模型推定是选型参考，不承诺库存或成交价；无关问题、空结果、格式错误、限流和超时均单独处理。
- 浏览器等待上限70秒，BFF转发取消信号，模型网关超时仍由后端配置控制。缺网关或调用失败仅显示暂不可用，不回退到 Mock 成功。
- 库存按采购单位核对：零租1单位=1卡；按台商品仅在总卡数/台数为正整数时换算。与调度共用 `compute.CardsPerUnit`。保留原有「部分满足」候选与解释；规格不足时不猜测容量或费用。
- 预算按照满足卡数的采购单位数与最低起订量、最短周期估算；买断归一为一次。不同计费方式、面议、未知规格、超界数值/金额都不能宣称预算内，金额复用交易校验。商品卡总量和买断单价按实际交易单位显示。
- 模型解析失败或网关错误仅保留错误类型、状态码及 request_id，不记录模型/网关响应正文，避免需求回显进入日志。
- **2026-09-28 起生产网关已接入**（自部署 DeepSeek，`deepseek-v4.1-flash`，超时 60s）：
  真实模型联调已通过（算力推定/机器方案/拒答防注入，见 `internal/agentsearch/live_test.go`，
  用 `TEST_AI_*` 环境变量可随时复跑）。前端可直接按本契约对接首页 agent。

## 官网首页悬浮算力顾问（前端实现，2026-09-28）

- 按用户最终要求，入口位于官网首页 `/` 与 `/landing`，点击 58px 粒子球展开同一容器内的轻量对话小窗；`?agent=open` 可直接打开。市场旧选型按钮已移除，旧 `/market/agent-search` 路由保留兼容。
- 面板为非模态小窗，无全页遮罩、不模糊整页背景、不锁定页面滚动或焦点；浏览和页面操作保持可用。移除大标题引导区与需求侧栏，先展示评估结论，再按需展开机器方案、在售商品和推导依据。
- 使用 `thinking-orbs@0.3.2`（MIT）；按用户最终偏好，浅色底与原始单色 weaving 粒子作为待机效果，悬停/按下有轻微响应，实际请求中使用 searching；开合采用同一容器的连续变形并保留同一粒子画布，减少动态偏好下静态切换。通过真实 SSE 增量展示 summary，result 到达后再展示完整方案和商品，不伪造推理或进度。
- 同源 BFF、鉴权与服务端限流沿用既有接口。游客可查看面板和填写需求，显式提交时进入登录，登录返回仍需再次提交。仅登录跳转前的需求草稿临时存入 sessionStorage（10 分钟有效，恢复即删除）；对话结果和已登录会话不持久化。
- 补充条件由浏览器附加到上一次成功评估的需求，整体仍按 Unicode codepoint 限制 500 字。不会静默截断，也不声称后端具备会话记忆。新评估清空本次内容，账号变更会清空对话；失败、停止或拒答不会污染已成功需求。
- 收起面板保留本页对话和正在进行的请求；停止、开启新评估或离开页面会中止当前等待。晚到的旧响应不得覆盖新评估。失败保留输入并提供显式重试。
- 区分建议机器方案与真实在售商品，价格/单位复用商品 adapter；无匹配不生成商品。返回值经过 Zod 校验，旧响应缺少新增字段时仍兼容。
- 组件：`src/components/agent/compute-advisor.tsx`、`assessment-result.tsx`；契约：`src/lib/agent-search.ts`。

## 流式评估：POST /market/agent-search/stream（2026-09-28）

与 JSON 接口使用相同的 Bearer 鉴权、`{query}` 请求和商品匹配逻辑；两者共享每用户每分钟 10 次限额。旧接口保持兼容。网关通过 OpenAI 兼容 `stream:true` 生成 JSON，仅把顶层用户可见的 `summary` 提前下发，原始模型 JSON、隐藏推理与网关错误正文不会转发给浏览器。

响应为 `text/event-stream`，带 `Cache-Control: no-cache, no-transform` 和 `X-Accel-Buffering: no`。事件以空行分隔：

```text
event: summary
data: {"text":"72B INT8 推理约需"}

event: summary
data: {"text":"72B INT8 推理约需 94GB 显存，建议 2 卡 A100。"}

event: result
data: {"code":0,"message":"success","data":{"relevant":true,"summary":"...","compute_estimate":{},"machine_plans":[],"requirement":{},"matches":[]},"request_id":"..."}

```

- `summary.text` 是累计文本（最多 120 个 Unicode codepoint），客户端替换当前前缀，不做定时打字模拟。结论在模型仍生成其他字段时即可显示。
- `result` 是终止事件，`data` 与原 JSON 接口完全一致；示例内对象为节略，必须按完整原契约校验。机器方案与真实商品只有在解析、归一化和确定性匹配完成后展示。
- `relevant=false` 时仅下发拒答 `result`，不发送分析或摘要。流中摘要是尚未完成的响应；遇到 `error` 或没有 `result` 的断流应撤去未完成摘要，保留输入并允许重新评估。
- 尚未开始 SSE 时，参数错误、限流或网关错误返回原 JSON 错误信封；开始后使用 `event:error`，`data` 为 `{code,message,request_id}`，随后关闭。鉴权失败仍由认证中间件返回 HTTP 401。
- 客户端中止或断连会取消网关请求。完整网关流须收到 `[DONE]` 后才可进入最终解析；不完整流不会当作成功。
- 浏览器等待上限 70 秒，单个 SSE 缓冲事件上限 256 KiB、总流上限 4 MiB。BFF `/api/market/agent-search/stream` 复用鉴权/刷新逻辑，直接转发响应流，禁用缓存与缓冲。

网关协议参考：[DeepSeek Chat Completions streaming](https://api-docs.deepseek.com/api/create-chat-completion/)。
