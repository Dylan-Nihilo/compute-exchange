"use client";

import {Button, Modal} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect, useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {AdminPage, AdminPanel} from "@/components/workspace/admin/admin-ui";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {useAuthStore} from "@/lib/auth/store";
import {formatDateTime} from "@/lib/format/date";
import {deleteNode, fetchAdminNodes, fetchSupplierNodes, nodeStatuses, registerNode, type ComputeNode, type NodeRegistrationInput} from "@/lib/scheduler";
import {fetchMyProducts, productTypeCopy} from "@/lib/supplier-workspace";

import {ScheduleAdvice} from "./schedule-advice";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const panelClass = "min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6";

export function SupplierNodes() {
  const accountId = useAuthStore((state) => state.accountId);
  return <SupplierNodePanel key={accountId} accountId={accountId} />;
}

function SupplierNodePanel({accountId}: {accountId: string | null}) {
  const client = useQueryClient();
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [cards, setCards] = useState("8");
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
  return <section className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
    <header><h1 className="text-3xl font-semibold">节点管理</h1><p className="mt-2 text-sm leading-6 text-muted">为商品接入节点心跳，查看容量、负载与在线状态。</p></header>
    <section className={panelClass}>
      <h2 className="text-base font-semibold">注册节点</h2>
      <form className="mt-4 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_2fr_1fr_auto]" onSubmit={(event) => {event.preventDefault(); if (!register.isPending && !credential) register.mutate({product_id: Number(productId), node_name: name.trim(), total_cards: Number(cards)});}}>
        <label className="min-w-0 text-sm font-medium">所属商品<select required className={inputClass} value={productId} disabled={products.isPending || products.isError || register.isPending} onChange={(event) => setProductId(event.target.value)}><option value="">请选择商品</option>{products.data?.map((product) => <option key={product.id} value={product.id}>#{product.id} · {product.gpu_model || productTypeCopy[product.product_type]} · {product.region}</option>)}</select></label>
        <label className="text-sm font-medium">节点名称<input className={inputClass} required maxLength={64} value={name} disabled={register.isPending} onChange={(event) => setName(event.target.value)} placeholder="例如 gpu-node-1" /></label>
        <label className="text-sm font-medium">节点总卡数<input className={inputClass} required type="number" min={1} max={2147483647} step={1} value={cards} disabled={register.isPending} onChange={(event) => setCards(event.target.value)} /></label>
        <Button type="submit" isPending={register.isPending} isDisabled={!productId || !name.trim() || products.isError || products.isPending || Boolean(credential) || remove.isPending}>注册节点</Button>
      </form>
      {products.isError ? <div className="mt-3 text-sm" role="alert"><p className="text-danger">商品读取失败：{products.error.message}</p><Button className="mt-2" size="sm" variant="outline" onPress={() => void products.refetch()}>重新读取商品</Button></div> : products.isSuccess && !products.data.length ? <p className="mt-3 text-sm text-muted">请先创建商品，再为该商品注册节点。</p> : null}
      {register.isError ? <p className="mt-3 text-sm text-danger" role="alert">注册失败：{register.error.message}。请核对已注册节点后再试。</p> : null}
      <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted">心跳接入说明</summary><div className="mt-3 space-y-2 text-xs leading-6 text-muted"><p>请在节点端每 30 秒上报一次真实可用卡数。90 秒未收到心跳后，平台会在巡检时将节点标记为离线。</p><p>POST /api/v1/node/heartbeat · 请求头 X-Node-Key 使用注册时的节点密钥。</p><p>请求字段：node_id、available_cards（必填），gpu_util_pct、vram_util_pct（选填，百分比）。</p></div></details>
    </section>
    <section className={panelClass} aria-label="我的节点">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">我的节点</h2><Button variant="outline" size="sm" isPending={nodes.isFetching} onPress={() => void nodes.refetch()}>刷新节点</Button></div>
      {nodes.isPending ? <p role="status" className="text-sm text-muted">正在读取节点…</p> : nodes.isError ? <p className="text-sm text-danger" role="alert">节点读取失败：{nodes.error.message}</p> : <NodesTable nodes={nodes.data ?? []} busy={remove.isPending || register.isPending} onDelete={(node) => {remove.reset(); setTarget(node);}} />}
    </section>
    <ConfirmDialog open={Boolean(target)} title="删除节点？" description={`删除「${target?.node_name ?? ""}」将使其节点密钥失效，并重新计算商品健康度。${remove.isError ? ` 删除失败：${remove.error.message}` : ""}`} confirmLabel="确认删除节点" isDestructive isPending={remove.isPending} onCancel={() => setTarget(null)} onConfirm={() => {if (target && !remove.isPending) remove.mutate(target.id);}} />
    <Modal.Root isOpen={Boolean(credential)} onOpenChange={(open) => {if (!open) {setCredential(null); setShowKey(false); setCopyError(""); register.reset();}}}>
      <Modal.Backdrop isDismissable={false}><Modal.Container><Modal.Dialog className="sm:max-w-lg">
        <Modal.Header><Modal.Heading>保存节点密钥</Modal.Heading></Modal.Header>
        <Modal.Body className="space-y-3">
          <p className="text-sm leading-6 text-muted">节点 #{credential?.id} 已注册。密钥只在本次展示，请保存到节点端配置；关闭后无法再次查看。</p>
          <label className="block text-sm font-medium">节点密钥<input autoComplete="off" readOnly type={showKey ? "text" : "password"} className={`${inputClass} font-mono`} value={credential?.key ?? ""} /></label>
          <div className="flex gap-2"><Button variant="outline" size="sm" onPress={() => setShowKey(!showKey)}>{showKey ? "隐藏密钥" : "显示密钥"}</Button><Button variant="outline" size="sm" onPress={async () => {try {await navigator.clipboard.writeText(credential?.key ?? ""); setCopied(true); setCopyError("");} catch {setCopyError("复制失败，请选择密钥手动复制。");}}}>{copied ? "已复制" : "复制密钥"}</Button></div>
          {copyError ? <p className="text-sm text-danger" role="alert">{copyError}</p> : null}
        </Modal.Body>
        <Modal.Footer><Button onPress={() => {setCredential(null); setShowKey(false); register.reset();}}>已保存并关闭</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
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
