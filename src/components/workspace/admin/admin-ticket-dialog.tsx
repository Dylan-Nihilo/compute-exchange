"use client";

import {Button, Label, Modal, TextArea, TextField} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {ErrorState} from "@/components/system/operation-state";
import {TicketConversation} from "@/components/workspace/tickets/ticket-conversation";
import {appendAdminTicketMessage, fetchAdminTicketDetail, updateAdminTicket} from "@/lib/admin-workspace";
import {ticketTypeCopy} from "@/lib/buyer-tickets";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {StatusBadge} from "./admin-ui";

export function AdminTicketDialog({id, onClose}: {id: number; onClose: () => void}) {
  const client = useQueryClient();
  const [reply, setReply] = useState("");
  const [decision, setDecision] = useState<"resolve" | "close" | null>(null);
  const query = useQuery({queryKey: ["admin", "tickets", "detail", id], queryFn: () => fetchAdminTicketDetail(id)});
  const mutation = useMutation({
    mutationFn: (action: "reply" | "claim" | "resolve" | "close") => action === "reply"
      ? appendAdminTicketMessage(id, reply)
      : updateAdminTicket(id, action),
    onSuccess: async (_, action) => {
      if (action === "reply") setReply("");
      setDecision(null);
      await client.invalidateQueries({queryKey: ["admin", "tickets"]});
      notify.success(action === "reply" ? "回复已发送" : "工单状态已更新");
    },
    onError: async (error) => {
      setDecision(null);
      notify.error(error instanceof Error ? error.message : "操作未完成");
      await client.invalidateQueries({queryKey: ["admin", "tickets"]});
    },
  });
  const ticket = query.data?.ticket;
  return <>
    <Modal.Backdrop isOpen isKeyboardDismissDisabled={mutation.isPending} onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>工单详情</Modal.Heading>
            {ticket ? <p className="break-all text-sm text-muted">{ticket.ticket_no} · {ticketTypeCopy[ticket.type] ?? ticket.type}</p> : null}
          </Modal.Header>
          <Modal.Body className="space-y-5">
            {query.isPending ? <p role="status">正在读取工单…</p> : query.isError ? <ErrorState title="工单详情暂时不可用" description={query.error.message} isPending={query.isFetching} onRetry={() => void query.refetch()} /> : ticket ? <>
              <div>
                <StatusBadge status={ticket.status} />
                <h2 className="mt-3 break-words text-lg font-semibold">{ticket.title}</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">关联订单</dt><dd className="break-all">{ticket.order_no}</dd></div>
                  <div><dt className="text-muted">买家</dt><dd>UID-{ticket.buyer_id}</dd></div>
                  <div><dt className="text-muted">提交时间</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
                  <div><dt className="text-muted">更新时间</dt><dd>{formatDateTime(ticket.updated_at)}</dd></div>
                </dl>
              </div>
              <section aria-label="沟通记录" className="border-t border-border pt-4">
                <h2 className="mb-4 font-semibold">沟通记录</h2>
                {query.data.messages.length ? <TicketConversation messages={query.data.messages} viewer="operator" /> : <p className="whitespace-pre-wrap break-words text-sm">{ticket.content}</p>}
              </section>
              {ticket.status === "processing" ? <form onSubmit={(event) => { event.preventDefault(); if (reply.trim().length >= 2 && !mutation.isPending) mutation.mutate("reply"); }}>
                <TextField fullWidth isDisabled={mutation.isPending} value={reply} onChange={setReply}>
                  <Label>回复买家</Label>
                  <TextArea rows={4} minLength={2} placeholder="说明处理进展或需要补充的信息" />
                </TextField>
                <div className="mt-3 flex justify-end"><Button type="submit" isDisabled={reply.trim().length < 2 || mutation.isPending} isPending={mutation.isPending && mutation.variables === "reply"}>发送回复</Button></div>
              </form> : <p className="text-sm text-muted">{ticket.status === "pending" ? "受理工单后可回复买家。" : "工单已完结或关闭，无法继续回复。"}</p>}
            </> : null}
          </Modal.Body>
          <Modal.Footer className="flex-wrap">
            <Button variant="tertiary" isDisabled={mutation.isPending} onPress={onClose}>返回列表</Button>
            {ticket?.status === "pending" ? <Button isDisabled={mutation.isPending} isPending={mutation.isPending && mutation.variables === "claim"} onPress={() => mutation.mutate("claim")}>受理工单</Button> : null}
            {ticket?.status === "processing" ? <Button isDisabled={mutation.isPending} onPress={() => setDecision("resolve")}>完结工单</Button> : null}
            {ticket && ticket.status !== "closed" ? <Button variant="danger-soft" isDisabled={mutation.isPending} onPress={() => setDecision("close")}>关闭工单</Button> : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
    <ConfirmDialog open={decision !== null} title={decision === "resolve" ? "完结工单" : "关闭工单"} confirmLabel={decision === "resolve" ? "完结工单" : "关闭工单"}
      description={`${reply.trim() ? "当前回复尚未发送。" : ""}工单 ${ticket?.ticket_no ?? ""} ${decision === "resolve" ? "完结" : "关闭"}后，双方将无法继续回复。请确认问题已处理。`}
      isDestructive={decision === "close"} isPending={mutation.isPending} onCancel={() => setDecision(null)} onConfirm={() => { if (decision) mutation.mutate(decision); }} />
  </>;
}
