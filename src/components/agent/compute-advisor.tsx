"use client";

import {Button} from "@heroui/react";
import {ArrowUp, Minus, Plus, RotateCcw, Square} from "lucide";
import {motion, useReducedMotion, useSpring, useTransform} from "motion/react";
import {useEffect, useRef, useState, type FormEvent} from "react";
import {ThinkingOrb} from "thinking-orbs";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {agentSearchQuerySchema, buildAgentQuery, type AgentSearchResult} from "@/lib/agent-search";
import {streamCompute} from "@/lib/agent-search-stream";
import {ApiError} from "@/lib/api/client";
import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";

import {AssessmentResult} from "./assessment-result";
import styles from "./compute-advisor.module.css";

const DRAFT_KEY = "omnis:advisor-login-draft";
const EXAMPLES = [
  {title: "部署大模型", query: "我想部署一个 72B 大模型做在线推理，使用 INT8 量化，并发不高，预算每月 10 万元以内。"},
  {title: "训练与微调", query: "我想对 7B 模型做 LoRA 微调，数据集约 10 万条，希望一周内完成，帮我评估机器配置。"},
  {title: "图像与视频生成", query: "我想部署图像生成服务，每天生成约 5000 张 1024 像素图片，优先考虑性价比，适合什么配置？"},
];

type Turn = {id: string; query: string; request: string; summary?: string; result?: AgentSearchResult; error?: string; needsLogin?: boolean; cancelled?: boolean};

export function ComputeAdvisor() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const account = useCurrentAccount();
  const hydrated = useAuthStore((state) => state.hasHydrated);
  useEffect(() => setMounted(true), []);
  return <AdvisorSession key={mounted ? account.data?.id ?? "guest" : "guest"} open={open} setOpen={setOpen} signedIn={mounted && Boolean(account.data)} authPending={!mounted || !hydrated || account.isPending} authError={mounted && account.isError} retryAuth={() => void account.refetch()} />;
}

function AdvisorSession({open, setOpen, signedIn, authPending, authError, retryAuth}: {open: boolean; setOpen: (open: boolean) => void; signedIn: boolean; authPending: boolean; authError: boolean; retryAuth: () => void}) {
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState("");
  const [unread, setUnread] = useState(false);
  const request = useRef<AbortController | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [orbColor, setOrbColor] = useState<string>();
  const panel = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const reducedMotion = useReducedMotion();
  const pointerX = useSpring(0, {stiffness: 350, damping: 32});
  const pointerY = useSpring(0, {stiffness: 350, damping: 32});
  const tiltX = useTransform(pointerY, [-4, 4], [8, -8]);
  const tiltY = useTransform(pointerX, [-4, 4], [-8, 8]);
  const morphTransition = {duration: reducedMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] as const};
  const effectiveQuery = buildAgentQuery(context, draft);
  const length = [...effectiveQuery].length;
  const latestResult = turns[turns.length - 1]?.result;

  useEffect(() => {
    openRef.current = open;
    pointerX.set(0); pointerY.set(0); setHovered(false); setPressed(false);
    if (open) {setUnread(false); panel.current?.focus({preventScroll: true});}
    else if (restoreFocus.current) {launcher.current?.focus({preventScroll: true}); restoreFocus.current = false;}
  }, [open, pointerX, pointerY]);
  useEffect(() => {setOrbColor(getComputedStyle(document.documentElement).getPropertyValue("--color-cs-accent").trim() || undefined);}, []);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;
    const update = () => {
      shell.current?.style.setProperty("--advisor-viewport-height", `${viewport.height}px`);
      shell.current?.style.setProperty("--advisor-keyboard-inset", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update);};
  }, [open]);
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
  }, [authPending, setOpen]);
  useEffect(() => {
    const target = latestResult ? latest.current?.querySelector<HTMLElement>("[data-advisor-answer]") : latest.current;
    if (open && target) transcript.current?.scrollTo({top: target.offsetTop, behavior: reducedMotion ? "instant" : "smooth"});
  }, [open, turns.length, latestResult, reducedMotion]);

  function close() {
    restoreFocus.current = true;
    setOpen(false);
  }

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
    panel.current?.focus({preventScroll: true});
    const controller = new AbortController();
    request.current = controller;
    const id = retryId ?? crypto.randomUUID();
    const turn = {id, query, request: parsed.data};
    setTurns((current) => retryId ? current.map((item) => item.id === id ? turn : item) : [...current, turn]);
    setPending(true); setValidation("");
    try {
      const result = await streamCompute(parsed.data, (text) => {
        if (controller.signal.aborted || request.current !== controller) return;
        setTurns((current) => current.map((item) => item.id === id ? {...item, summary: text} : item));
      }, fetch, controller.signal);
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
    panel.current?.focus({preventScroll: true});
    request.current?.abort(); request.current = null; setPending(false);
    setTurns((current) => current.map((turn, index) => index === current.length - 1 && !turn.result ? {...turn, cancelled: true, error: "已停止评估，你可以继续调整需求。"} : turn));
  }

  function reset() {
    request.current?.abort(); request.current = null;
    setPending(false); setTurns([]); setContext(""); setDraft(""); setValidation(""); setUnread(false);
    panel.current?.focus({preventScroll: true});
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || pending || authPending || authError) return;
    void evaluate(draft.trim(), effectiveQuery);
  }

  return <motion.div ref={shell} layout={!reducedMotion} className={styles.dock} data-open={open} data-has-messages={turns.length > 0} data-hovered={hovered} data-pressed={pressed} data-busy={pending} data-streaming={pending && Boolean(turns[turns.length - 1]?.summary)} style={{borderRadius: open ? 22 : 29}} transition={{layout: morphTransition}}>
    <motion.div layout={!reducedMotion} transition={{layout: morphTransition}} className={styles.orbCore} style={{borderRadius: 999}} aria-hidden="true">
      <motion.span className={styles.orbTilt} style={{x: reducedMotion ? 0 : pointerX, y: reducedMotion ? 0 : pointerY, rotateX: reducedMotion ? 0 : tiltX, rotateY: reducedMotion ? 0 : tiltY}} animate={{scale: reducedMotion ? 1 : pressed ? 0.91 : hovered ? 1.06 : 1}} transition={{duration: pressed ? 0.12 : 0.22}}>
        <ThinkingOrb theme="dark" color={orbColor} state={pending ? "searching" : "connecting"} size={64} style={{width: "100%", height: "100%"}} dots={1.3} dotSize={1} speed={0.8} paused={Boolean(reducedMotion)} aria-hidden="true" />
      </motion.span>
    </motion.div>
    <motion.button ref={launcher} className={styles.launcher} type="button" aria-label={unread ? "打开算力顾问，评估已完成" : "打开算力顾问"} aria-expanded={open} aria-controls="compute-advisor" aria-haspopup="dialog" aria-hidden={open} inert={open} tabIndex={open ? -1 : 0} onClick={() => setOpen(true)} onPointerEnter={() => setHovered(true)} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerCancel={() => setPressed(false)} onBlur={() => setPressed(false)} onKeyDown={(event) => {if (event.key === "Enter" || event.key === " ") setPressed(true);}} onKeyUp={() => setPressed(false)} onPointerLeave={() => {setHovered(false); setPressed(false); pointerX.set(0); pointerY.set(0);}} onPointerMove={(event) => {
      if (reducedMotion || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      pointerX.set((event.clientX - rect.left - rect.width / 2) / rect.width * 8);
      pointerY.set((event.clientY - rect.top - rect.height / 2) / rect.height * 8);
    }} initial={false} animate={{opacity: open ? 0 : 1}} transition={{duration: reducedMotion ? 0 : 0.14}}>
      <span className="sr-only">{pending ? "正在评估你的需求" : unread ? "方案已就绪" : "算力顾问"}</span>
      {unread ? <span className={styles.unread} /> : null}
    </motion.button>
    <motion.section layout={reducedMotion ? false : "position"} ref={panel} id="compute-advisor" role="dialog" aria-modal="false" aria-labelledby="advisor-title" aria-hidden={!open} inert={!open} tabIndex={-1} className={styles.panel} initial={false} animate={open ? {opacity: 1, y: 0} : {opacity: 0, y: 5}} transition={{layout: morphTransition, duration: reducedMotion ? 0 : open ? 0.24 : 0.12, delay: reducedMotion || !open ? 0 : 0.09, ease: [0.16, 1, 0.3, 1]}} onKeyDown={(event) => {if (event.key === "Escape" && !event.nativeEvent.isComposing) {event.stopPropagation(); close();}}}>
      <header className={styles.header}>
        <div className={styles.identity}><h2 id="advisor-title">OmniS <span>算力顾问</span></h2><span className={styles.connection}>{pending ? "评估中" : "随时聊聊"}</span></div>
        <div className={styles.headerActions}><Button variant="ghost" size="sm" isIconOnly onPress={reset} aria-label="开启新评估"><InteractiveIcon icon={Plus} size={16} /></Button><Button variant="ghost" size="sm" isIconOnly onPress={close} aria-label="收起算力顾问"><InteractiveIcon icon={Minus} size={17} /></Button></div>
      </header>
      <div ref={transcript} className={styles.transcript} role="log" aria-label="算力顾问对话" aria-live="polite" aria-busy={pending}>
        {!turns.length ? <div className={styles.welcome}>
          <h3>在找什么算力？</h3>
          <p>说说你的业务，我帮你看看配置。</p>
          <div className={styles.examples}>{EXAMPLES.map((example) => <button key={example.title} type="button" disabled={authPending} onClick={() => {setDraft(example.query); setValidation(""); input.current?.focus();}}>{example.title}</button>)}</div>
        </div> : turns.map((turn, index) => <div key={turn.id} className={styles.turn} ref={index === turns.length - 1 ? latest : undefined}>
          <div className={styles.userMessage}><span>你</span><p>{turn.query}</p></div>
          <div data-advisor-answer className={styles.assistantLabel}><span className={styles.assistantMark} aria-hidden="true" /><span>OmniS 算力顾问</span></div>
          {turn.result ? <AssessmentResult result={turn.result} /> : turn.error ? <div className={styles.error} role="alert"><h3>{turn.cancelled ? "评估已停止" : "这次评估未完成"}</h3><p>{turn.error}</p><Button size="sm" variant="outline" isDisabled={pending} onPress={() => turn.needsLogin ? signIn(turn.request) : void evaluate(turn.query, turn.request, turn.id)}><InteractiveIcon icon={RotateCcw} size={14} />{turn.needsLogin ? "重新登录" : "重新评估"}</Button></div> : turn.summary ? <div className={styles.streamingAnswer}><p className={styles.streamText}>{turn.summary}<span className={styles.streamCaret} aria-hidden="true" /></p><p className={styles.thinking} role="status">正在完善配置方案…</p></div> : <p className={styles.thinking} role="status">正在评估你的算力需求<span className={styles.thinkingDots} aria-hidden="true">···</span></p>}
        </div>)}
      </div>
      <form onSubmit={submit} className={styles.composer}>

        <div className={styles.inputBox}>
          <label className="sr-only" htmlFor="advisor-query">{context ? "补充或调整算力需求" : "描述算力需求"}</label>
          <textarea ref={input} id="advisor-query" rows={2} maxLength={1000} value={draft} disabled={pending || authPending} aria-describedby="advisor-input-hint" aria-invalid={length > 500 || Boolean(validation)} placeholder={context ? "补充预算、并发或地域，再比较一次…" : "描述你的需求…"} onChange={(event) => {setDraft(event.target.value); setValidation("");}} onKeyDown={(event) => {if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); event.currentTarget.form?.requestSubmit();}}} />
          <div className={styles.composerBottom}><p id="advisor-input-hint" className={length > 500 ? styles.invalid : undefined}>{pending ? "可收起窗口，评估会继续" : authPending ? "正在确认登录状态…" : signedIn ? "Enter 发送" : "登录后开始评估"}</p><div className={styles.sendActions}>{length > 0 ? <span className={length > 500 ? styles.invalid : undefined}>{length}/500</span> : null}{pending ? <Button key="stop" className={styles.send} type="button" isIconOnly aria-label="停止评估" onPress={cancel}><InteractiveIcon icon={Square} size={16} /></Button> : <Button key="send" className={styles.send} type="submit" isIconOnly aria-label={signedIn ? "发送算力需求" : "登录并继续评估"} isDisabled={!draft.trim() || length > 500 || authPending || authError}><InteractiveIcon icon={ArrowUp} size={19} /></Button>}</div></div>
        </div>
        {validation || length > 500 ? <p className={styles.validation} role="alert">{validation || "当前需求与补充内容合计最多 500 字，请精简描述或开启新评估。"}</p> : null}
        {authError ? <p className={styles.validation} role="alert">登录状态暂不可用。<button type="button" onClick={retryAuth}>重新读取</button></p> : null}
        <p className={styles.composerNote}>评估供参考，库存与价格以商品为准。</p>
      </form>
    </motion.section>
  </motion.div>;
}
