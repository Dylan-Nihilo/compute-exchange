import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteSupplierNotification,
  fetchSupplierNotifications,
  fetchSupplierUnreadNotificationCount,
  markAllSupplierNotificationsRead,
  markSupplierNotificationRead,
} from "./supplier-notifications.ts";

const baseNotification = {
  id: 5,
  user_id: 9,
  type: "order",
  title: "订单待交付",
  content: "订单 ORD-20260827-001 已支付，请尽快交付资源。",
  link: "/console/supplier/orders",
  read_at: null,
  created_at: "2026-08-27T02:00:00Z",
};

test("fetchSupplierNotifications forwards type filter and parses counts", async () => {
  let requestedUrl = "";
  const page = await fetchSupplierNotifications({type: "order", page: 2, pageSize: 10}, async (input) => {
    requestedUrl = String(input);
    return Response.json({
      code: 0, message: "success",
      data: {
        list: [baseNotification], total: 11, unread: 4,
        type_counts: {system: 2, order: 3, ticket: 6},
        page: 2, page_size: 10,
      },
    });
  });
  assert.equal(requestedUrl, "/api/supplier/notifications?type=order&page=2&page_size=10");
  assert.equal(page.notifications.length, 1);
  assert.equal(page.unread, 4);
  assert.deepEqual(page.typeCounts, {system: 2, order: 3, ticket: 6});

  const empty = await fetchSupplierNotifications({}, async () =>
    Response.json({code: 0, message: "success", data: {list: null, total: 0, unread: 0, type_counts: {system: 0, order: 0, ticket: 0}, page: 1, page_size: 20}}));
  assert.deepEqual(empty.notifications, []);
});

test("fetchSupplierUnreadNotificationCount reads only the unread field", async () => {
  let requestedUrl = "";
  const unread = await fetchSupplierUnreadNotificationCount(async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {list: [], total: 9, unread: 7, type_counts: {system: 2, order: 3, ticket: 4}, page: 1, page_size: 1}});
  });
  assert.equal(requestedUrl, "/api/supplier/notifications?page_size=1");
  assert.equal(unread, 7);
});

test("read/read-all/delete surface backend code errors", async () => {
  await markSupplierNotificationRead(5, async (input, init) => {
    assert.equal(String(input), "/api/supplier/notifications/5/read");
    assert.equal(init?.method, "POST");
    return Response.json({code: 0, message: "success"});
  });

  await markAllSupplierNotificationsRead(async () => Response.json({code: 0, message: "success", data: {marked: 2}}));

  await deleteSupplierNotification(5, async (input, init) => {
    assert.equal(init?.method, "DELETE");
    return Response.json({code: 0, message: "success"});
  });

  await assert.rejects(
    markSupplierNotificationRead(5, async () => Response.json({code: 40400, message: "notification not found"})),
    /notification not found/,
  );
  await assert.rejects(
    deleteSupplierNotification(5, async () => Response.json({code: 40400, message: "notification not found"})),
    /notification not found/,
  );
});
