import {isBuyerOrderNo} from "./buyer-orders.ts";

/**
 * 易宝收银台支付完成后的回跳落地页。
 *
 * 收银台从 cash.yeepay.com 跨站跳回本站: 若以 POST 回跳, SameSite=Lax 的登录 Cookie 不会随请求发送,
 * 直接落在需要登录的订单页会被中间件当成未登录而跳去登录页。这里先落在一个不要求登录的页面,
 * 再由本站页面发起同站 GET 跳转到订单详情, 登录 Cookie 照常携带。
 *
 * 只接受格式合法的订单号, 目标固定为站内订单详情, 不构成开放跳转。
 */
export function paymentReturnTarget(orderNo: string): string {
  return isBuyerOrderNo(orderNo) ? `/console/buyer/orders/${orderNo}` : "/console/buyer/orders";
}

export function paymentReturnHtml(orderNo: string): string {
  const target = paymentReturnTarget(orderNo);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${target}">
<title>正在返回订单…</title>
</head>
<body style="font-family:system-ui,sans-serif;color:#173447;padding:48px 24px;text-align:center">
<p>支付已提交，正在返回订单详情…</p>
<p><a href="${target}">没有自动跳转？点此查看订单</a></p>
</body>
</html>`;
}
