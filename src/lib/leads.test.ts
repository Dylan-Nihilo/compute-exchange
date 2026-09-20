import assert from "node:assert/strict";
import {it} from "node:test";

import {buildLeadDescription, submitLead} from "./leads.ts";

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

it("encodes construction scope, location and scale in the existing lead description", async () => {
  const description = buildLeadDescription({intent: " 高低压配电系统、暖通制冷系统 ", location: " 北京海淀 ", scale: "50 个机柜 / 1 MW", detail: " 分期扩容 "});
  assert.equal(description, "【意向方案】高低压配电系统、暖通制冷系统\n【项目所在地】北京海淀\n【建设规模】50 个机柜 / 1 MW\n分期扩容");
  assert.equal(buildLeadDescription({detail: " 仅需前期咨询 "}), "仅需前期咨询");
  assert.equal(buildLeadDescription({intent: "回租", detail: "自有 GPU 服务器"}), "【意向方案】回租\n自有 GPU 服务器");
  const input = {type: "construction" as const, contact_name: "测试联系人", contact_phone: "18800001001", description, amount_range: "100-500 万", term: "1-3 个月", source: "construction_page"};
  await submitLead(input, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({code: 0, data: {id: 13}});
  });
});
