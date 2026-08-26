import assert from "node:assert/strict";
import test from "node:test";

import {
  appendTicketMessage,
  closeTicket,
  createTicket,
  fetchBuyerTicketDetail,
  fetchBuyerTickets,
  isTicketNo,
  ticketTitleFromContent,
} from "./buyer-tickets.ts";

const baseTicket = {
  id: 1,
  ticket_no: "WO-20260826-001",
  buyer_id: 2,
  order_no: "ORD20260801123456ab12",
  type: "resource_fault",
  title: "实例无法连接",
  content: "从今早开始 SSH 无法连接实例。",
  status: "processing",
  resolved_at: null,
  closed_at: null,
  created_at: "2026-08-26T09:00:00Z",
  updated_at: "2026-08-26T09:30:00Z",
};

test("ticketTitleFromContent flattens whitespace and truncates at 30 chars", () => {
  assert.equal(ticketTitleFromContent("实例无法连接"), "实例无法连接");
  assert.equal(ticketTitleFromContent("第一行\n第二行\t第三行"), "第一行 第二行 第三行");
  assert.equal(ticketTitleFromContent("  前后有空格  "), "前后有空格");
  const long = "这是一段特别长的问题描述用来验证超过三十个字符时会被正确截断并追加省略号";
  const title = ticketTitleFromContent(long);
  assert.equal(title.length, 31);
  assert.ok(title.endsWith("…"));
});

test("isTicketNo validates the WO-YYYYMMDD-NNN format", () => {
  assert.equal(isTicketNo("WO-20260826-001"), true);
  assert.equal(isTicketNo("WO-20260826-1234"), true);
  assert.equal(isTicketNo("wo-20260826-001"), false);
  assert.equal(isTicketNo("INV-2026-0001"), false);
  assert.equal(isTicketNo(""), false);
});

test("createTicket posts the payload and returns the ticket summary", async () => {
  let requestBody = "";
  const result = await createTicket(
    {order_no: "ORD-1", type: "appeal", title: "账单异议", content: "对 8 月账单金额有异议。"},
    async (input, init) => {
      requestBody = String(init?.body);
      assert.equal(String(input), "/api/buyer/tickets");
      assert.equal(init?.method, "POST");
      return Response.json({
        code: 0, message: "success",
        data: {ticket_no: "WO-20260826-002", status: "pending"},
      });
    },
  );
  assert.equal(result.ticket_no, "WO-20260826-002");
  assert.equal(JSON.parse(requestBody).type, "appeal");

  await assert.rejects(
    createTicket(
      {order_no: "ORD-9", type: "appeal", title: "x", content: "x"},
      async () => Response.json({code: 40300, message: "无权对该订单发起工单: 订单不属于当前买家"}),
    ),
    /无权对该订单发起工单/,
  );
});

test("fetchBuyerTickets forwards filters and normalizes an empty page", async () => {
  let requestedUrl = "";
  const empty = await fetchBuyerTickets({status: "pending", keyword: "WO"}, async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {list: null, total: 0, page: 1, page_size: 20}});
  });
  assert.equal(requestedUrl, "/api/buyer/tickets?status=pending&keyword=WO");
  assert.deepEqual(empty.tickets, []);

  const page = await fetchBuyerTickets({page: 2, pageSize: 10}, async () =>
    Response.json({code: 0, message: "success", data: {list: [baseTicket], total: 11, page: 2, page_size: 10}}));
  assert.equal(page.tickets.length, 1);
  assert.equal(page.tickets[0].status, "processing");
  assert.equal(page.total, 11);
});

test("fetchBuyerTicketDetail reads ticket with messages", async () => {
  const detail = await fetchBuyerTicketDetail("WO-20260826-001", async (input) => {
    assert.equal(String(input), "/api/buyer/tickets/WO-20260826-001");
    return Response.json({
      code: 0, message: "success",
      data: {
        ticket: baseTicket,
        messages: [
          {id: 1, ticket_id: 1, sender_type: "buyer", sender_id: 2, content: "无法连接", created_at: "2026-08-26T09:00:00Z"},
          {id: 2, ticket_id: 1, sender_type: "operator", sender_id: 1, content: "正在排查", created_at: "2026-08-26T09:30:00Z"},
        ],
      },
    });
  });
  assert.equal(detail.ticket.title, "实例无法连接");
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[1].sender_type, "operator");

  await assert.rejects(fetchBuyerTicketDetail("bad-no"), /工单号无效/);
});

test("appendTicketMessage and closeTicket surface backend code errors", async () => {
  await appendTicketMessage("WO-20260826-001", "补充: 重启后仍无法连接", async () =>
    Response.json({code: 0, message: "success"}));

  await assert.rejects(
    appendTicketMessage("WO-20260826-001", "x", async () =>
      Response.json({code: 40001, message: "工单已完结或关闭, 无法继续回复"})),
    /无法继续回复/,
  );

  await closeTicket("WO-20260826-001", async () =>
    Response.json({code: 0, message: "success"}));

  await assert.rejects(
    closeTicket("WO-20260826-001", async () =>
      Response.json({code: 40001, message: "工单已关闭"})),
    /工单已关闭/,
  );
});
