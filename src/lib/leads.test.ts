import assert from "node:assert/strict";
import {it} from "node:test";

import {submitLead} from "./leads.ts";

it("preserves the financing lead contract and accepts only a valid HTTP and business success", async () => {
  const input = {
    type: "finance_lease" as const,
    company_name: "测试企业", contact_name: "测试联系人", contact_phone: "18800001001",
    description: "【意向方案】回租\n自有 GPU 服务器", amount_range: "100-500 万", term: "1-2 年", source: "leasing_page",
  };
  assert.deepEqual(await submitLead(input, async (url, init) => {
    assert.equal(url, "/api/leads");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({code: 0, data: {id: 12}});
  }), {id: 12});
  await assert.rejects(submitLead(input, async () => Response.json({code: 0, data: {id: 12}}, {status: 500})));
  await assert.rejects(submitLead(input, async () => Response.json({code: 42900, message: "提交过于频繁"})), /提交过于频繁/);
  await assert.rejects(submitLead(input, async () => Response.json({code: 0, data: {id: 0}})));
});
