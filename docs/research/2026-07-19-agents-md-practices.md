# AGENTS.md 主流实践与 N.O.V.A. 更新建议

日期：2026-07-19

## 结论

新版 `~/.codex/AGENTS.md` 应是一份短小的个人操作契约，只保留 Dylan 的稳定偏好、N.O.V.A. 的人格语气、授权边界和通用完成标准。

项目结构、技术栈、命令和局部工程约定应进入仓库或子目录 `AGENTS.md`；偶发工作流应进入 skills；可由 linter、formatter、hooks、permissions 或 sandbox 确定执行的规则，不应重复消耗模型上下文。

当前 N.O.V.A. 提示词的核心人格可以保留。主要需要压缩逐句禁词、删除工具专属协议、减少与 Codex 内建工程规则重复的内容，并把抽象要求改成少量可观察行为。

## 主流共识

### 1. 按作用域分层

- 全局文件：个人语言、语气、授权偏好、跨项目硬边界。
- 仓库根目录：项目目的、关键目录、构建测试命令、非显然约定和风险点。
- 子目录：只写该模块不同于上层的规则。
- Skill 或 path-scoped rule：按任务或文件类型加载的专项流程。

`AGENTS.md` 官方规范把它定义为“给 agent 的 README”，推荐写项目概览、构建测试命令、代码约定和安全注意事项，并规定离目标文件最近的 `AGENTS.md` 优先。[agents.md](https://agents.md/)

Codex 从全局 `~/.codex/AGENTS.md` 开始，再按 Git root 到当前目录的顺序合并项目文件；更靠近当前目录的规则后加载并覆盖上层规则。[OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)

### 2. Always-on 内容必须短、具体、普遍适用

Anthropic 建议只保留每次 session 都需要的内容，并用一个问题删减规则：“删除这一行会不会导致 agent 犯错？”不会就删。其推荐内容包括准确命令、非默认约定、简短架构、硬约束和常见坑；应排除完整 API 文档、历史、显而易见的信息和没有真实执行的愿望清单。[Claude Code best practices](https://code.claude.com/docs/en/best-practices)

GitHub 建议从 10–20 条最常用、具体的规则开始，使用短标题、bullets 和祈使句，再根据真实表现逐步增加。[GitHub custom instructions](https://docs.github.com/en/copilot/tutorials/customize-code-review)

HumanLayer 建议 root 文件尽可能短，使用 progressive disclosure，把任务专属知识放到按需读取的文档或 skills；其公开仓库根 `CLAUDE.md` 约 64 个有效行。[HumanLayer article](https://www.humanlayer.dev/blog/writing-a-good-claude-md) · [HumanLayer CLAUDE.md](https://github.com/humanlayer/humanlayer/blob/main/CLAUDE.md)

### 3. 写模型无法可靠推断的内容

高价值内容通常是：

- 精确命令及其适用范围；
- 不符合生态默认值的项目约定；
- 关键架构边界；
- 真实发生过的坑；
- 哪些文件不能改；
- 什么结果才算完成；
- 如何获得可读的 pass/fail 信号。

低价值内容通常是：

- “写高质量代码”“遵循最佳实践”等抽象美德；
- 可以从源码、配置或目录树直接发现的信息；
- formatter 和 linter 已经确定执行的样式规则；
- 很少触发的专项流程；
- 同一要求的多种改写和重复示例。

HumanLayer明确反对让 LLM 充当昂贵的 linter，建议把格式化和静态检查交给确定性工具。[Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)

### 4. 目标、边界和完成标准优先于微观步骤

当前 reasoning models 更适合接收明确目标、强约束和输出契约，同时保留中间求解空间。对 agentic workflow，应定义什么算完成以及如何验证。[OpenAI reasoning prompting](https://developers.openai.com/api/docs/guides/reasoning#advice-on-prompting)

对 Codex，长期有效的授权模式可以压缩为：

- 回答、解释、review、diagnose：检查并报告，不擅自扩大为修改。
- change、build、fix：直接完成范围内的本地修改和非破坏性验证。
- 外部写入、生产、破坏性操作或实质扩大范围：先确认。

Codex 官方 prompting guide 同时强调端到端完成、合理假设、根因修复、复用现有实现、保护 dirty worktree 和验证结果。[Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)

### 5. Persona、workflow 和 enforcement 各自承担一种职责

- Persona：角色、判断姿态、语气和输出体验。
- AGENTS.md：稳定、长期、适用于该作用域的事实与约定。
- Skills：按任务加载的多步骤流程、参考资料和脚本。
- Hooks、linters、permissions、sandbox：需要确定执行的规则。

Addy Osmani 的公开 agent-skills 仓库明确区分 personas、skills 和 commands，并避免把所有流程复制进 root `AGENTS.md`。[agent-skills AGENTS.md](https://github.com/addyosmani/agent-skills/blob/main/AGENTS.md)

Anthropic 也将 persona/output style 与 project instructions、skills 分开：persona 负责角色和语气，项目文件负责代码库上下文，skills 负责可复用任务流程。[Claude Code output styles](https://code.claude.com/docs/en/output-styles)

## 优秀仓库的真实样本

| 仓库 | 有效长度 | 主要内容 | 可借鉴点 |
| --- | ---: | --- | --- |
| [simonw/llm](https://github.com/simonw/llm/blob/main/AGENTS.md) | 约 18 行 | 环境安装、测试、文档构建 | 极简，只写 agent 需要执行的命令 |
| [temporalio/sdk-java](https://github.com/temporalio/sdk-java/blob/main/AGENTS.md) | 约 52 行 | 仓库地图、公开 API 边界、构建测试、PR checklist | 每条都具体且可验证 |
| [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer/blob/main/CLAUDE.md) | 约 64 行 | WHAT、WHY、HOW、命令和少数约定 | 用短地图帮助 agent 找上下文 |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/blob/main/AGENTS.md) | 约 57 行 | 作用域、skill 路由、职责边界 | 明确哪些内容不属于 root 文件 |
| [openai/codex](https://github.com/openai/codex/blob/main/AGENTS.md) | 约 241 行 | Rust、测试、API、UI、生成文件等具体规则 | 复杂仓库允许更长，但内容全部服务真实仓库约束 |
| [apache/airflow](https://github.com/apache/airflow/blob/main/AGENTS.md) | 约 407 行 | 精确环境、架构、安全模型、测试和发布规则 | 长文件是大型 monorepo 的特例，不适合作为全局人格模板 |

这些样本没有统一模板，但共同特点是具体、可执行、与实际仓库绑定。没有优秀仓库靠大量抽象人格形容词来替代命令、边界和验证。

## 实证研究提供的警告

这些研究较新，应视为方向性证据，不是最终定论。

- CTXbench 对多个 coding agents 的实验发现，context files 会增加探索、测试和推理成本，但没有稳定提升任务成功率；开发者维护的文件明显优于自动生成文件。作者建议只保留最小必要要求。[Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988)
- 对 100 个流行开源仓库的分析发现，常见问题包括 Lint Leakage、Context Bloat、Skill Leakage 和 Conflicting Instructions。[Configuration Smells in AGENTS.md Files](https://arxiv.org/abs/2606.15828)
- 另一项大规模实验认为，限制无关改动等硬 guardrails 比泛化的正向工程建议更稳定，但该结论仍需更多复现。[Guardrails Beat Guidance](https://arxiv.org/abs/2604.11088)

## 对当前 N.O.V.A. 草案的审计

### 保留

- N.O.V.A. 身份及 J.A.R.V.I.S. / F.R.I.D.A.Y. 式的沉稳、机敏和克制。
- 中文默认、技术术语和代码保留英文。
- 自然称呼 `Sir` 或 `Dylan`。
- 结论先行、坦诚说明不确定性、必要时提出异议。
- 授权清晰时行动；高风险、外部或不可逆操作先确认。
- 只有经过必要验证后才宣称完成。
- 前端不得把需求说明、设计理由或审计结论渲染成产品可见文案。

### 压缩

- 将逐句“禁止话术”压缩成 3–4 条可观察的表达原则。
- 将重复出现的“简洁、直接、不要铺垫”合并成一条。
- 将工程工作流压缩成请求类型、授权边界和完成标准，不复述 Codex 内建 prompt。
- 前端边界保留两条，不再列多个页面文案例子。

### 移除或迁移

- Notion 签名协议：移出 always-on 全局文件，按需放到 Notion 专属 skill 或 connector policy。
- 具体工具名、命令和技术栈：放到对应仓库 `AGENTS.md`。
- linter/formatter 能强制的规则：交给项目配置或 hook。
- 多步骤专项流程：放到 skills。
- 任意固定段数限制：改成“默认简洁，按任务复杂度展开”。

## 推荐的新版结构

目标控制在约 35–60 个有效行，先使用 15–25 条稳定规则：

1. `Identity`：N.O.V.A. 是谁，以及人格不能压过真实性和安全性。
2. `Voice`：中文、称呼、结论先行、克制幽默和反油腻原则。
3. `Operating Contract`：回答、诊断、修改三类请求如何行动。
4. `Judgment and Truth`：异议、不确定性、事实与推断。
5. `Hard Boundaries`：外部/破坏性操作与前端可见文案边界。
6. `Done`：修改、验证、缺口和完成声明。

更新后应在新 Codex session 中验证：

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

还应使用 5–8 个真实任务做行为回归：简单问答、诊断、局部修改、dirty worktree、前端 mock、高风险操作和信息不确定场景。观察实际行为后一次只调整一小组规则。
