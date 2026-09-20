"use client";

import {Button, Input, Modal, Skeleton} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {Activity, BookOpen, Check, ChevronDown, CircleAlert, Copy, Cpu, KeyRound, Plus, RotateCw, Search, Server, Trash2} from "lucide";
import Link from "next/link";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {AdminPage, AdminPanel} from "@/components/workspace/admin/admin-ui";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {useAuthStore} from "@/lib/auth/store";
import {formatDateTime} from "@/lib/format/date";
import {deleteNode, fetchAdminNodes, fetchSupplierNodes, nodeStatuses, registerNode, type ComputeNode, type NodeRegistrationInput} from "@/lib/scheduler";
import {fetchMyProducts, productTypeCopy} from "@/lib/supplier-workspace";

import {ScheduleAdvice} from "./schedule-advice";
import styles from "./supplier-nodes.module.css";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SupplierNodes() {
  const accountId = useAuthStore((state) => state.accountId);
  return <SupplierNodePanel key={accountId} accountId={accountId} />;
}

function SupplierNodePanel({accountId}: {accountId: string | null}) {
  const client = useQueryClient();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [cards, setCards] = useState("8");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [credential, setCredential] = useState<{id: number; key: string} | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [target, setTarget] = useState<ComputeNode | null>(null);
  const nodes = useQuery({queryKey: ["scheduler", accountId, "supplier", "nodes"], queryFn: () => fetchSupplierNodes(), retry: false, refetchInterval: 30000, staleTime: 0, gcTime: 0});
  const products = useQuery({queryKey: ["supplier", accountId, "node-products"], queryFn: () => fetchMyProducts(), retry: false, staleTime: 0, gcTime: 0});
  const register = useMutation({
    retry: false, gcTime: 0,
    mutationFn: async (input: NodeRegistrationInput) => {
      const result = await registerNode(input);
      // Keep the one-time credential in this mounted view, never in mutation/query data.
      setCredential({id: result.node.id, key: result.node_key});
      setShowKey(false); setCopied(false); setCopyError(""); setName("");
    },
    onSuccess: () => {void client.invalidateQueries({queryKey: ["scheduler", accountId]});},
  });
  const remove = useMutation({mutationFn: (id: number) => deleteNode(id), onSuccess: () => {setTarget(null); void client.invalidateQueries({queryKey: ["scheduler", accountId]});}});
  const allNodes = nodes.data ?? [];
  const productsById = new Map(products.data?.map((product) => [product.id, product]));
  const productLabel = (id: number) => {
    const product = productsById.get(id);
    return product ? `${product.gpu_model || productTypeCopy[product.product_type]} · ${product.region}` : `商品 #${id}`;
  };
  const filteredNodes = allNodes.filter((node) =>
    (status === "all" || node.status === status) &&
    `${node.node_name} ${node.id} ${node.product_id} ${productLabel(node.product_id)}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const metrics = [
    {label: "已接入节点", value: allNodes.length, unit: "个", icon: Server},
    {label: "正常运行", value: allNodes.filter((node) => node.status === "online").length, unit: "个", icon: Activity},
    {label: "需关注", value: allNodes.filter((node) => node.status !== "online").length, unit: "个", icon: CircleAlert},
    {label: "在线可用 GPU", value: allNodes.reduce((sum, node) => sum + (node.status === "offline" ? 0 : node.available_cards), 0), unit: "卡", icon: Cpu},
  ];
  const openRegistration = () => {register.reset(); setRegistrationOpen(true);};
  const closeRegistration = () => {
    setRegistrationOpen(false); setCredential(null); setShowKey(false); setCopyError(""); register.reset();
  };
  const canRegister = Boolean(productId && name.trim() && Number.isInteger(Number(cards)) && Number(cards) > 0 && Number(cards) <= 2147483647 && products.isSuccess && !credential && !remove.isPending);

  return <section className={`${styles.theme} mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8`}>
    <div>
      <WorkspacePageHeader title="节点管理" actions={
        <Button className={styles.primary} onPress={openRegistration}>
          <InteractiveIcon icon={Plus} size={16} />添加节点
        </Button>
      } />
      <p className="mt-1 text-[13px] text-muted">查看节点运行状态与可用算力，管理机房接入。</p>
    </div>

    <GlassCard className={styles.metrics}>
      {metrics.map((metric) => <div className={styles.metric} key={metric.label}>
        <div className={styles.metricLabel}><span>{metric.label}</span><InteractiveIcon icon={metric.icon} size={17} /></div>
        <div className={styles.metricValue}>{nodes.isPending ? <Skeleton className="h-8 w-12 rounded-lg" /> : nodes.isError ? "—" : metric.value}<span>{metric.unit}</span></div>
      </div>)}
    </GlassCard>

    <GlassCard className="min-w-0 px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={styles.iconTile}><InteractiveIcon icon={Server} size={18} /></span>
          <div><h2 className="text-[15px] font-semibold">节点列表</h2><p className="mt-0.5 text-xs text-muted">每 30 秒自动刷新</p></div>
        </div>
        <Button aria-label="刷新节点" className={styles.secondary} isPending={nodes.isFetching} onPress={() => void nodes.refetch()} variant="outline">
          <InteractiveIcon icon={RotateCw} size={15} /><span className="hidden sm:inline">刷新</span>
        </Button>
      </div>
      <div className={styles.toolbar}>
        <div aria-label="按节点状态筛选" className={styles.filters} role="group">
          {[["all", "全部节点"], ["online", "在线"], ["degraded", "资源紧张"], ["offline", "离线"]].map(([value, label]) => <Button
            aria-pressed={status === value} className={styles.filter} key={value} onPress={() => setStatus(value)} size="sm" variant="ghost"
          >{label}<span>{nodes.isSuccess ? (value === "all" ? allNodes.length : allNodes.filter((node) => node.status === value).length) : "—"}</span></Button>)}
        </div>
        <div className={styles.search}>
          <InteractiveIcon icon={Search} size={16} />
          <Input aria-label="搜索节点或商品" placeholder="搜索节点 / 商品" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>
      <div aria-busy={nodes.isFetching} className="min-h-[330px]">
        {nodes.isPending ? <div className="space-y-3 py-4" role="status" aria-label="正在读取节点">{[0, 1, 2, 3].map((row) => <Skeleton className="h-14 rounded-xl" key={row} />)}</div>
          : nodes.isError ? <ErrorState title="节点暂时无法加载" description={nodes.error.message} isPending={nodes.isFetching} onRetry={() => void nodes.refetch()} />
          : !allNodes.length ? <EmptyState icon={Server} title="接入你的第一个节点" description="将机房节点关联到算力商品，上报心跳后即可查看在线状态、GPU 余量与负载。" action={<Button className={styles.primary} onPress={openRegistration}><InteractiveIcon icon={Plus} size={16} />添加节点</Button>} />
          : !filteredNodes.length ? <EmptyState icon={Search} title="没有符合条件的节点" description="试试其他节点名称、商品或运行状态。" action={<Button className={styles.secondary} variant="outline" onPress={() => {setSearch(""); setStatus("all");}}>清除筛选</Button>} />
          : <div className="omnis-scrollbar-x">
            <table className={styles.table}>
              <caption className="sr-only">供应方节点状态、容量和负载</caption>
              <thead><tr><th scope="col">节点 / 所属商品</th><th scope="col">运行状态</th><th scope="col">可用 / 总卡数</th><th scope="col">GPU / 显存负载</th><th scope="col">最近心跳</th><th scope="col" className="text-right">操作</th></tr></thead>
              <tbody>{filteredNodes.map((node) => <tr key={node.id}>
                <th scope="row"><p className={styles.nodeName}>{node.node_name}</p><p className={styles.productName} title={productLabel(node.product_id)}>{productLabel(node.product_id)}</p><p className={styles.nodeId}>节点 #{node.id} · 商品 #{node.product_id}</p></th>
                <td><span className={styles.status} data-status={node.status} title={nodeStatuses[node.status]}><span />{node.status === "degraded" ? "资源紧张" : nodeStatuses[node.status]}</span></td>
                <td><p className="tabular-nums"><strong className="text-base font-semibold">{node.status === "offline" ? "—" : node.available_cards}</strong><span className="text-muted"> / {node.total_cards} 卡</span></p><div aria-hidden="true" className={styles.capacity}><span style={{width: `${node.status === "offline" || !node.total_cards ? 0 : Math.min(100, node.available_cards / node.total_cards * 100)}%`}} /></div></td>
                <td className="tabular-nums">{node.status === "offline" ? <span className="text-muted">暂无实时数据</span> : <><span>{node.gpu_util_pct == null ? "未上报" : `${node.gpu_util_pct}%`}</span><span className="text-muted"> / {node.vram_util_pct == null ? "未上报" : `${node.vram_util_pct}%`}</span></>}</td>
                <td className="text-xs text-muted">{node.last_heartbeat_at ? formatDateTime(node.last_heartbeat_at) : "等待首次心跳"}</td>
                <td className="text-right"><Button aria-label={`删除节点 ${node.node_name}`} className="min-h-10 min-w-10" isIconOnly isDisabled={remove.isPending || register.isPending} onPress={() => {remove.reset(); setTarget(node);}} size="sm" variant="ghost"><InteractiveIcon className="text-muted" icon={Trash2} size={16} /></Button></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </div>
      {nodes.isSuccess && !allNodes.length ? <ol className={styles.steps}>
        <li><span>01</span><div><strong>关联商品</strong><p>选择节点提供算力的商品</p></div></li>
        <li><span>02</span><div><strong>保存密钥</strong><p>注册后妥善保存节点凭证</p></div></li>
        <li><span>03</span><div><strong>上报心跳</strong><p>接入后持续同步状态与余量</p></div></li>
      </ol> : null}
      {nodes.isSuccess && allNodes.length > 0 ? <p className="mt-4 text-xs text-muted" role="status">显示 {filteredNodes.length} / {allNodes.length} 个节点 · 离线节点不计入在线可用 GPU</p> : null}
    </GlassCard>

    <details className={styles.guide}>
      <summary><span className="flex items-center gap-2"><InteractiveIcon icon={BookOpen} size={16} />节点接入说明</span><span className={styles.guideHint}>心跳频率与接入方式<InteractiveIcon icon={ChevronDown} size={15} /></span></summary>
      <div className={styles.guideBody}>
        <p>每 30 秒上报一次真实可用卡数。超过 90 秒未收到心跳，平台会在巡检时将节点标记为离线。</p>
        <p>发送 <code>POST /api/v1/node/heartbeat</code>，请求头 <code>X-Node-Key</code> 使用注册时保存的节点密钥。</p>
        <p>必填：<code>node_id</code>、<code>available_cards</code>；选填：<code>gpu_util_pct</code>、<code>vram_util_pct</code>（百分比）。</p>
        <p>节点状态会影响所属商品健康度；商品全部节点离线时，买家将暂时无法下单。</p>
      </div>
    </details>

    <ConfirmDialog open={Boolean(target)} title="删除节点？" description={`删除「${target?.node_name ?? ""}」将使其节点密钥失效，并重新计算商品健康度。${remove.isError ? ` 删除失败：${remove.error.message}` : ""}`} confirmLabel="确认删除节点" isDestructive isPending={remove.isPending} onCancel={() => setTarget(null)} onConfirm={() => {if (target && !remove.isPending) remove.mutate(target.id);}} />
    <Modal.Root isOpen={registrationOpen} onOpenChange={(open) => {if (!open && !register.isPending && !credential) closeRegistration();}}>
      <Modal.Backdrop isDismissable={!register.isPending && !credential} isKeyboardDismissDisabled={register.isPending || Boolean(credential)}>
        <Modal.Container><Modal.Dialog className={`${styles.theme} ${styles.dialog} sm:max-w-lg`}>
          <Modal.Header>
            <span className={`${styles.iconTile} mb-2`}><InteractiveIcon icon={credential ? KeyRound : Server} size={20} /></span>
            <Modal.Heading>{credential ? "节点已创建，保存接入密钥" : "添加节点"}</Modal.Heading>
            <p className="mt-2 text-[13px] leading-6 text-muted">{credential ? `节点 #${credential.id} 已注册，配置心跳后即可同步运行状态。` : "将节点关联到已有商品，接入机房的真实算力。"}</p>
          </Modal.Header>
          <Modal.Body>
            {credential ? <div className="space-y-4">
              <p className={styles.notice}>密钥仅展示一次，关闭后无法找回。请保存到节点端配置，不要公开分享。</p>
              <div className={styles.field}><label htmlFor="node-key">节点密钥</label><Input id="node-key" autoComplete="off" readOnly type={showKey ? "text" : "password"} className="font-mono" value={credential.key} /></div>
              <div className="flex flex-wrap gap-2"><Button className={styles.secondary} variant="outline" size="sm" onPress={() => setShowKey(!showKey)}>{showKey ? "隐藏密钥" : "显示密钥"}</Button><Button className={styles.secondary} variant="outline" size="sm" onPress={async () => {try {await navigator.clipboard.writeText(credential.key); setCopied(true); setCopyError("");} catch {setCopyError("复制失败，请选择密钥手动复制。");}}}><InteractiveIcon icon={copied ? Check : Copy} size={15} />{copied ? "已复制" : "复制密钥"}</Button></div>
              {copyError ? <p className="text-sm text-danger" role="alert">{copyError}</p> : null}
            </div> : <form id="register-supplier-node" className="space-y-5" onSubmit={(event) => {event.preventDefault(); if (canRegister && !register.isPending) register.mutate({product_id: Number(productId), node_name: name.trim(), total_cards: Number(cards)});}}>
              <div className={styles.field}><label htmlFor="node-product">所属商品</label><select id="node-product" required value={productId} disabled={!products.isSuccess || register.isPending} onChange={(event) => setProductId(event.target.value)}><option value="">{products.isPending ? "正在读取商品…" : "请选择要关联的商品"}</option>{products.data?.map((product) => <option key={product.id} value={product.id}>#{product.id} · {product.gpu_model || productTypeCopy[product.product_type]} · {product.region}</option>)}</select></div>
              {products.isError ? <div role="alert" className="text-sm"><p className="text-danger">商品读取失败：{products.error.message}</p><Button className="mt-2" size="sm" variant="outline" isPending={products.isFetching} onPress={() => void products.refetch()}>重新读取商品</Button></div> : products.isSuccess && !products.data.length ? <p className="text-sm text-muted">请先<Link className="mx-1 underline underline-offset-4" href="/console/supplier/products/new">发布算力商品</Link>，再为商品添加节点。</p> : null}
              <div className={styles.field}><label htmlFor="node-name">节点名称</label><Input id="node-name" aria-describedby="node-name-hint" required maxLength={64} value={name} disabled={register.isPending} onChange={(event) => setName(event.target.value)} placeholder="例如 beijing-h100-01" /><span id="node-name-hint">建议包含地域与设备型号，便于识别。</span></div>
              <div className={styles.field}><label htmlFor="node-cards">节点总卡数</label><Input id="node-cards" aria-describedby="node-cards-hint" required type="number" min={1} max={2147483647} step={1} value={cards} disabled={register.isPending} onChange={(event) => setCards(event.target.value)} /><span id="node-cards-hint">填写该节点实际安装的 GPU 数量。</span></div>
              <p className={styles.notice}>添加后需配置心跳上报。节点接入状态会影响所属商品的可售状态。</p>
              {register.isError ? <p className="text-sm text-danger" role="alert">注册失败：{register.error.message}。请核对节点列表后再试。</p> : null}
            </form>}
          </Modal.Body>
          <Modal.Footer>
            {credential ? <Button className={styles.primary} onPress={closeRegistration}>已保存密钥</Button> : <><Button className={styles.secondary} isDisabled={register.isPending} onPress={closeRegistration} variant="ghost">取消</Button><Button className={styles.primary} type="submit" form="register-supplier-node" isPending={register.isPending} isDisabled={!canRegister || register.isPending}>{register.isPending ? "正在创建…" : "创建节点"}</Button></>}
          </Modal.Footer>
          {!credential && !register.isPending ? <Modal.CloseTrigger /> : null}
        </Modal.Dialog></Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  </section>;
}

function NodesTable({nodes, admin = false, busy = false, onDelete}: {nodes: ComputeNode[]; admin?: boolean; busy?: boolean; onDelete?: (node: ComputeNode) => void}) {
  if (!nodes.length) return <p className="py-5 text-sm text-muted">暂无节点记录</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-4">
    <thead className="bg-surface-secondary text-xs text-muted"><tr><th scope="col">节点 / 商品</th>{admin ? <th scope="col">供应方</th> : null}<th scope="col">状态</th><th scope="col">可用 / 总卡数</th><th scope="col">GPU / 显存负载</th><th scope="col">最近心跳</th>{onDelete ? <th scope="col">操作</th> : null}</tr></thead>
    <tbody className="divide-y divide-border">{nodes.map((node) => <tr key={node.id}>
      <td><p className="max-w-48 break-all font-medium">{node.node_name}</p><p className="mt-1 text-xs text-muted">节点 #{node.id} · 商品 #{node.product_id}</p></td>
      {admin ? <td>{node.supplier_name || `#${node.supplier_id}`}</td> : null}
      <td className="whitespace-nowrap">{nodeStatuses[node.status]}</td><td>{node.available_cards} / {node.total_cards} 卡</td><td>{node.gpu_util_pct == null ? "未上报" : `${node.gpu_util_pct}%`} / {node.vram_util_pct == null ? "未上报" : `${node.vram_util_pct}%`}</td>
      <td className="whitespace-nowrap">{node.last_heartbeat_at ? formatDateTime(node.last_heartbeat_at) : "尚未收到心跳"}</td>
      {onDelete ? <td><Button variant="danger-soft" size="sm" aria-label={`删除节点 ${node.node_name}`} isDisabled={busy} onPress={() => onDelete(node)}>删除</Button></td> : null}
    </tr>)}</tbody>
  </table></div>;
}

export function AdminNodes() {
  const accountId = useAuthStore((state) => state.accountId);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [orderInput, setOrderInput] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const client = useQueryClient();
  const query = useQuery({queryKey: ["scheduler", accountId, "admin", "nodes", status, page], queryFn: () => fetchAdminNodes(status, page), retry: false, refetchInterval: 30000, staleTime: 0});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));
  useEffect(() => {if (query.isSuccess && query.isFetchedAfterMount && !query.isFetching && page > pages) setPage(pages);}, [page, pages, query.isSuccess, query.isFetchedAfterMount, query.isFetching]);
  return <AdminPage title="节点与调度" description="查看供应方节点健康和容量，按订单核对调度建议。">
    <AdminPanel className="p-5 sm:p-6"><form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {event.preventDefault(); if (orderInput.trim()) {setOrderNo(orderInput.trim()); void client.invalidateQueries({queryKey: ["scheduler", accountId, "admin", "advice"]});}}}>
      <label className="min-w-0 flex-1 text-sm font-medium">订单编号<input className={inputClass} required maxLength={64} value={orderInput} onChange={(event) => setOrderInput(event.target.value)} /></label><Button type="submit" isDisabled={!orderInput.trim()}>查询调度建议</Button>
    </form></AdminPanel>
    {orderNo ? <ScheduleAdvice key={`${accountId}:${orderNo}`} orderNo={orderNo} role="admin" /> : null}
    <AdminPanel className="min-w-0 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="text-sm font-medium">节点状态<select className={inputClass} value={status} onChange={(event) => {setStatus(event.target.value); setPage(1);}}><option value="">全部状态</option>{Object.entries(nodeStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Button variant="outline" isPending={query.isFetching} onPress={() => void query.refetch()}>刷新节点</Button></div>
      {query.isPending ? <p role="status" className="text-sm text-muted">正在读取节点…</p> : query.isError ? <p className="text-sm text-danger" role="alert">节点读取失败：{query.error.message}</p> : <>
        <p className="mb-3 text-xs text-muted">共 {query.data.total} 个节点</p><NodesTable nodes={query.data.list} admin />
        <div className="mt-4"><ListPagination page={page} totalPages={pages} onPageChange={setPage} /></div>
      </>}
    </AdminPanel>
  </AdminPage>;
}
