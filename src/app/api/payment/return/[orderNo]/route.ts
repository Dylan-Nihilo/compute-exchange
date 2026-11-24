import {paymentReturnHtml} from "@/lib/payment-return";

type Context = {params: Promise<{orderNo: string}>};

async function respond(context: Context) {
  const {orderNo} = await context.params;
  return new Response(paymentReturnHtml(orderNo), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}

// 易宝可能以 GET 或 POST 回跳, 两种都落到同一页面。
export async function GET(_request: Request, context: Context) {
  return respond(context);
}

export async function POST(_request: Request, context: Context) {
  return respond(context);
}
