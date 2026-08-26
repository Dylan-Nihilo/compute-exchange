import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteNotification,
  fetchBuyerNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./buyer-notifications.ts";

const baseNotification = {
  id: 3,
  user_id: 2,
  type: "ticket",
  title: "工单有新回复",
  content: "您的工单 WO-20260826-001 收到平台运营回复。",
  link: "/console/buyer/tickets/WO-20260826-001",
  read_at: null,
  created_at: "2026-08-26T10:47:00Z",
};

test("fetchBuyerNotifications forwards type filter and parses counts", async () => {
  let requestedUrl = "";
  const page = await fetchBuyerNotifications({type: "ticket", page: 2, pageSize: 10}, async (input) => {
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
  assert.equal(requestedUrl, "/api/buyer/notifications?type=ticket&page=2&page_size=10");
  assert.equal(page.notifications.length, 1);
  assert.equal(page.unread, 4);
  assert.deepEqual(page.typeCounts, {system: 2, order: 3, ticket: 6});

  const empty = await fetchBuyerNotifications({}, async () =>
    Response.json({code: 0, message: "success", data: {list: null, total: 0, unread: 0, type_counts: {system: 0, order: 0, ticket: 0}, page: 1, page_size: 20}}));
  assert.deepEqual(empty.notifications, []);
});

test("fetchUnreadNotificationCount reads only the unread field", async () => {
  let requestedUrl = "";
  const unread = await fetchUnreadNotificationCount(async (input) => {
    requestedUrl = String(input);
    return Response.json({code: 0, message: "success", data: {list: [], total: 9, unread: 7, type_counts: {system: 2, order: 3, ticket: 4}, page: 1, page_size: 1}});
  });
  assert.equal(requestedUrl, "/api/buyer/notifications?page_size=1");
  assert.equal(unread, 7);
});

test("read/read-all/delete surface backend code errors", async () => {
  await markNotificationRead(3, async (input, init) => {
    assert.equal(String(input), "/api/buyer/notifications/3/read");
    assert.equal(init?.method, "POST");
    return Response.json({code: 0, message: "success"});
  });

  await markAllNotificationsRead(async () => Response.json({code: 0, message: "success", data: {marked: 3}}));

  await deleteNotification(3, async (input, init) => {
    assert.equal(init?.method, "DELETE");
    return Response.json({code: 0, message: "success"});
  });

  await assert.rejects(
    markNotificationRead(3, async () => Response.json({code: 40400, message: "notification not found"})),
    /notification not found/,
  );
  await assert.rejects(
    deleteNotification(3, async () => Response.json({code: 40400, message: "notification not found"})),
    /notification not found/,
  );
});
