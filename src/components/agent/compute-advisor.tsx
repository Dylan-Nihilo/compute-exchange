"use client";

import {Button, Modal} from "@heroui/react";
import {ArrowRight, ArrowUp, Cpu, Minus, Plus, RotateCcw, Square} from "lucide";
import {useReducedMotion} from "motion/react";
import {useEffect, useRef, useState, type FormEvent} from "react";
import {ThinkingOrb} from "thinking-orbs";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {agentSearchQuerySchema, buildAgentQuery, searchCompute, type AgentSearchResult} from "@/lib/agent-search";
import {ApiError} from "@/lib/api/client";
import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";

import {AssessmentResult} from "./assessment-result";
import styles from "./compute-advisor.module.css";

const DRAFT_KEY = "omnis:advisor-login-draft";
const EXAMPLES = [
  {title: "部署大模型", detail: "推理 · 显存 · 并发", query: "我想部署一个 72B 大模型做在线推理，使用 INT8 量化，并发不高，预算每月 10 万元以内。"},
  {title: "训练与微调", detail: "训练 · 多卡 · 预算", query: "我想对 7B 模型做 LoRA 微调，数据集约 10 万条，希望一周内完成，帮我评估机器配置。"},
  {title: "图像与视频生成", detail: "生成 · 效率 · 成本", query: "我想部署图像生成服务，每天生成约 5000 张 1024 像素图片，优先考虑性价比，适合什么配置？"},
];

type Turn = {id: string; query: string; request: string; result?: AgentSearchResult; error?: string; needsLogin?: boolean; cancelled?: boolean};

export function ComputeAdvisor() {
  const account = useCurrentAccount();
  const hydrated = useAuthStore((state) => state.hasHydrated);
  return <AdvisorSession key={account.data?.id ?? "guest"} signedIn={Boolean(account.data)} authPending={!hydrated || account.isPending} authError={account.isError} retryAuth={() => void account.refetch()} />;
}

function AdvisorSession({signedIn, authPending, authError, retryAuth}: {signedIn: boolean; authPending: boolean; authError: boolean; retryAuth: () => void}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState("");
  const [unread, setUnread] = useState(false);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const reducedMotion = useReducedMotion();
  const effectiveQuery = buildAgentQuery(context, draft);
  const length = [...effectiveQuery].length;
  const lastResult = [...turns].reverse().find((turn) => turn.result?.relevant)?.result;
  const requirement = lastResult?.relevant ? lastResult.requirement : null;

  useEffect(() => {openRef.current = open; if (open) setUnread(false);}, [open]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (authPending) return;
    if (new URLSearchParams(window.location.search).get("agent") === "open") setOpen(true);
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      sessionStorage.removeItem(DRAFT_KEY);
      if (typeof saved.at === "number" && Date.now() - saved.at < 600000 && agentSearchQuerySchema.safeParse(saved.query).success) {
        setDraft(saved.query); setOpen(true);
      }
    } catch { /* Browsing remains usable when session storage is unavailable. */ }
  }, [authPending]);
  useEffect(() => {
    if (open && turns.length) latest.current?.scrollIntoView({block: "start", behavior: reducedMotion ? "instant" : "smooth"});
  }, [open, turns.length, reducedMotion]);
  useEffect(() => {
    if (!open || !turns.length || document.activeElement !== document.body) return;
    const target = pending ? input.current?.closest<HTMLElement>("[role=dialog]") : input.current;
    target?.focus({preventScroll: true});
  }, [open, pending, turns.length]);

  function signIn(query = effectiveQuery) {
    try {sessionStorage.setItem(DRAFT_KEY, JSON.stringify({query, at: Date.now()}));} catch { /* Login does not depend on storage. */ }
    const next = `${window.location.pathname}?agent=open`;
    window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  async function evaluate(query: string, compiled: string, retryId?: string) {
    if (request.current) return;
    const parsed = agentSearchQuerySchema.safeParse(compiled);
    if (!parsed.success) {setValidation("当前需求与补充内容合计最多 500 字，请精简描述或开启新评估。"); return;}
    if (!signedIn) {signIn(parsed.data); return;}
    const controller = new AbortController();
    request.current = controller;
    const id = retryId ?? crypto.randomUUID();
    const turn = {id, query, request: parsed.data};
    setTurns((current) => retryId ? current.map((item) => item.id === id ? turn : item) : [...current, turn]);
    setPending(true); setValidation("");
    try {
      const result = await searchCompute(parsed.data, fetch, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      setTurns((current) => current.map((item) => item.id === id ? {...turn, result} : item));
      if (result.relevant) setContext(parsed.data);
      setDraft((current) => current.trim() === query ? "" : current);
      if (!openRef.current) setUnread(true);
    } catch (error) {
      if (controller.signal.aborted || request.current !== controller) return;
      setTurns((current) => current.map((item) => item.id === id ? {...turn, error: error instanceof Error ? error.message : "评估暂不可用，请稍后重试。", needsLogin: error instanceof ApiError && error.status === 401} : item));
    } finally {
      if (request.current === controller) {request.current = null; setPending(false);}
    }
  }

  function cancel() {
    request.current?.abort(); request.current = null; setPending(false);
    setTurns((current) => current.map((turn, index) => index === current.length - 1 && !turn.result ? {...turn, cancelled: true, error: "已停止评估，你可以继续调整需求。"} : turn));
  }

  function reset() {
    request.current?.abort(); request.current = null;
    setPending(false); setTurns([]); setContext(""); setDraft(""); setValidation(""); setUnread(false);
    input.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || pending || authPending || authError) return;
    void evaluate(draft.trim(), effectiveQuery);
  }

  return <Modal.Root isOpen={open} onOpenChange={setOpen}>
    <Button className={styles.launcher} variant="ghost" aria-label={unread ? "打开算力顾问，评估已完成" : "打开算力顾问"}>
      <span className={styles.launcherOrb}><ThinkingOrb theme="light" state={pending ? "searching" : unread ? "connecting" : "weaving"} size={64} paused={open} aria-hidden="true" /></span>
      <span className={styles.launcherText}><strong>OmniS 算力顾问</strong><span>{pending ? "正在评估你的需求" : unread ? "评估已完成，查看方案" : "聊聊你的业务需求"}</span></span>
      {unread ? <span className={styles.unread} /> : null}
    </Button>
    <Modal.Backdrop className={styles.backdrop} isDismissable>
      <Modal.Container className={styles.container} placement="center" size="cover">
        <Modal.Dialog className={styles.dialog}>
          <Modal.Header className={styles.header}>
            <div className={styles.identity}><ThinkingOrb theme="light" state={pending ? "searching" : "breathing"} size={32} aria-hidden="true" /><div><Modal.Heading className={styles.heading}>OmniS <span>算力顾问</span></Modal.Heading><p>{pending ? "正在评估" : "从业务需求，到合适的算力"}</p></div></div>
            <div className={styles.headerActions}><Button variant="ghost" size="sm" onPress={reset} aria-label="开启新评估"><InteractiveIcon icon={Plus} size={16} /><span>新评估</span></Button><Button variant="ghost" size="sm" isIconOnly slot="close" aria-label="收起算力顾问"><InteractiveIcon icon={Minus} size={19} /></Button></div>
          </Modal.Header>
          <div className={styles.workspace}>
            <div className={styles.conversation}>
              <div className={styles.transcript} role="log" aria-label="算力顾问对话" aria-live="polite" aria-busy={pending}>
                {!turns.length ? <div className={styles.welcome}>
                  <div className={styles.welcomeOrb}><ThinkingOrb theme="light" state={draft ? "listening" : "weaving"} size={64} aria-hidden="true" /></div>
                  <p className={styles.eyebrow}>你的下一步，从这里开始</p>
                  <h2>先说业务，<br />再选算力。</h2>
                  <p className={styles.welcomeCopy}>告诉我你想运行的模型或应用，<br className={styles.desktopBreak} />一起找到合适的机器配置。</p>
                  <div className={styles.examples}>{EXAMPLES.map((example) => <button key={example.title} type="button" className={styles.example} onClick={() => {setDraft(example.query); setValidation(""); input.current?.focus();}}><span><strong>{example.title}</strong><small>{example.detail}</small></span><InteractiveIcon icon={ArrowRight} size={17} /></button>)}</div>
                </div> : turns.map((turn, index) => <div key={turn.id} className={styles.turn} ref={index === turns.length - 1 ? latest : undefined}>
                  <div className={styles.userMessage}><span>你</span><p>{turn.query}</p></div>
                  <div className={styles.assistantLabel}><ThinkingOrb theme="light" state={pending && index === turns.length - 1 ? "searching" : "connecting"} size={20} paused={!pending || index !== turns.length - 1} aria-hidden="true" /><span>OmniS 算力顾问</span></div>
                  {turn.result ? <AssessmentResult result={turn.result} /> : turn.error ? <div className={styles.error} role="alert"><h3>{turn.cancelled ? "评估已停止" : "这次评估未完成"}</h3><p>{turn.error}</p><Button size="sm" variant="outline" isDisabled={pending} onPress={() => turn.needsLogin ? signIn(turn.request) : void evaluate(turn.query, turn.request, turn.id)}><InteractiveIcon icon={RotateCcw} size={14} />{turn.needsLogin ? "重新登录" : "重新评估"}</Button></div> : <div className={styles.thinking} role="status"><ThinkingOrb theme="light" state="searching" size={64} aria-hidden="true" /><div><strong>正在评估你的算力需求</strong><p>结合任务规模与预算，查找可行配置和在售商品。</p></div></div>}
                </div>)}
              </div>
              <form onSubmit={submit} className={styles.composer}>
                {context ? <div className={styles.contextHint}><span />基于当前需求继续评估<Button size="sm" variant="ghost" onPress={reset} isDisabled={pending}>换个需求</Button></div> : null}
                <div className={styles.inputBox}>
                  <label className="sr-only" htmlFor="advisor-query">{context ? "补充或调整算力需求" : "描述算力需求"}</label>
                  <textarea ref={input} id="advisor-query" rows={2} maxLength={1000} value={draft} disabled={pending || authPending} aria-describedby="advisor-input-hint" aria-invalid={length > 500 || Boolean(validation)} placeholder={context ? "补充预算、并发或地域，再比较一次…" : "想做什么？例如：部署 72B 大模型，预算每月 10 万…"} onChange={(event) => {setDraft(event.target.value); setValidation("");}} onKeyDown={(event) => {if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); event.currentTarget.form?.requestSubmit();}}} />
                  <div className={styles.composerBottom}><p id="advisor-input-hint" className={length > 500 ? styles.invalid : undefined}>{pending ? "可收起窗口，评估会继续" : authPending ? "正在确认登录状态…" : signedIn ? "Enter 发送 · Shift + Enter 换行" : "登录后即可开始评估"}</p><div className={styles.sendActions}><span className={length > 500 ? styles.invalid : undefined}>{length}/500</span>{pending ? <Button className={styles.send} type="button" isIconOnly aria-label="停止评估" onPress={cancel}><InteractiveIcon icon={Square} size={16} /></Button> : <Button className={styles.send} type="submit" isIconOnly aria-label={signedIn ? "发送算力需求" : "登录并继续评估"} isDisabled={!draft.trim() || length > 500 || authPending || authError}><InteractiveIcon icon={ArrowUp} size={19} /></Button>}</div></div>
                </div>
                {validation || length > 500 ? <p className={styles.validation} role="alert">{validation || "当前需求与补充内容合计最多 500 字，请精简描述或开启新评估。"}</p> : null}
                {authError ? <p className={styles.validation} role="alert">登录状态暂不可用。<button type="button" onClick={retryAuth}>重新读取</button></p> : null}
                <p className={styles.composerNote}>评估供选型参考，库存与价格以商品详情为准。</p>
              </form>
            </div>
            <aside className={styles.brief} aria-label="当前需求摘要">
              <div><div className={styles.briefTitle}><InteractiveIcon icon={Cpu} size={17} /><h3>当前需求</h3></div>
                {context ? <><p className={styles.briefPurpose}>{requirement?.purpose || "算力资源评估"}</p><dl className={styles.briefFacts}><div><dt>参考型号</dt><dd>{requirement?.gpu_models.join(" / ") || "未限定"}</dd></div><div><dt>地域偏好</dt><dd>{requirement?.region || "未限定"}</dd></div><div><dt>预算上限</dt><dd>{requirement?.budget_fen_max ? `¥${(requirement.budget_fen_max / 100).toLocaleString("zh-CN")}` : "未限定"}</dd></div></dl><details className={styles.briefDetails}><summary>查看完整需求</summary><p>{context}</p></details></> : <><p className={styles.briefIntro}>把需求说清楚，<br />让配置更贴近你的业务。</p><ol className={styles.guide}>{[["工作负载", "推理、训练，还是图像生成？"], ["模型与规模", "模型大小、精度、并发或数据量。"], ["采购条件", "预算、地域与预计使用周期。"]].map(([title, description], index) => <li key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol></>}
              </div>
              <div className={styles.briefFooter}><span className={styles.briefMark}>OmniS</span><p>看清需求，比较方案，<br />再做采购决定。</p></div>
            </aside>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal.Root>;
}
