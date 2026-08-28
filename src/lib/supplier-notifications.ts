import {z} from "zod";

import {
  notificationTypes,
  type NotificationType,
  type NotificationTypeCounts,
} from "./buyer-notifications.ts";

// 与买家消息中心共用后端 /notifications 接口, 仅 BFF 前缀不同 (按角色隔离代理入口)。

const notificationSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  type: z.enum(notificationTypes),
  title: z.string(),
  content: z.string(),
  link: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

const listEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.object({
    list: z.array(notificationSchema).nullable(),
    total: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
    type_counts: z.object({
      system: z.number().int().nonnegative(),
      order: z.number().int().nonnegative(),
      ticket: z.number().int().nonnegative(),
    }),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
  }).optional(),
});

const actionEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});

export type SupplierNotification = z.infer<typeof notificationSchema>;

export type SupplierNotificationPage = {
  notifications: SupplierNotification[];
  total: number;
  unread: number;
  typeCounts: NotificationTypeCounts;
  page: number;
  pageSize: number;
};

export type {NotificationType};

export async function fetchSupplierNotifications(
  query: {type?: string; page?: number; pageSize?: number} = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<SupplierNotificationPage> {
  const params = new URLSearchParams();
  if (query.type) params.set("type", query.type);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));
  const url = `/api/supplier/notifications${params.size ? `?${params}` : ""}`;

  let response: Response;
  try {
    response = await fetchImplementation(url, {cache: "no-store"});
  } catch {
    throw new Error("消息服务暂不可用");
  }
  const parsed = listEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("消息服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "消息列表读取失败");
  }
  const data = parsed.data.data;
  return {
    notifications: data?.list ?? [],
    total: data?.total ?? 0,
    unread: data?.unread ?? 0,
    typeCounts: data?.type_counts ?? {system: 0, order: 0, ticket: 0},
    page: data?.page ?? 1,
    pageSize: data?.page_size ?? 20,
  };
}

// 顶栏角标只需要未读数: 拉最小一页取 unread 字段。
export async function fetchSupplierUnreadNotificationCount(
  fetchImplementation: typeof fetch = fetch,
) {
  const page = await fetchSupplierNotifications({pageSize: 1}, fetchImplementation);
  return page.unread;
}

async function postNotificationAction(
  path: string,
  fallbackMessage: string,
  fetchImplementation: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetchImplementation(path, {method: "POST"});
  } catch {
    throw new Error("消息服务暂不可用");
  }
  const parsed = actionEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("消息服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || fallbackMessage);
  }
}

export function markSupplierNotificationRead(id: number, fetchImplementation: typeof fetch = fetch) {
  return postNotificationAction(`/api/supplier/notifications/${id}/read`, "标记已读失败", fetchImplementation);
}

export function markAllSupplierNotificationsRead(fetchImplementation: typeof fetch = fetch) {
  return postNotificationAction("/api/supplier/notifications/read-all", "全部已读失败", fetchImplementation);
}

export async function deleteSupplierNotification(id: number, fetchImplementation: typeof fetch = fetch) {
  let response: Response;
  try {
    response = await fetchImplementation(`/api/supplier/notifications/${id}`, {method: "DELETE"});
  } catch {
    throw new Error("消息服务暂不可用");
  }
  const parsed = actionEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("消息服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "删除失败");
  }
}
