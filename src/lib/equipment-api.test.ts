import assert from "node:assert/strict";
import {it} from "node:test";

import {
  buildEquipmentMarketHref,
  defaultEquipmentQuery,
  fetchEquipmentMarket,
  formatEquipmentPrice,
  formatWanRange,
  mapEquipmentProduct,
  parseEquipmentQuery,
  parseWanRange,
  submitEquipmentInquiry,
  type EquipmentWire,
} from "./equipment-api.ts";

it("parses and rebuilds the equipment market URL as the single source of filter state", () => {
  const query = parseEquipmentQuery({
    equipment_type: "gpu_server",
    condition_type: "used",
    region: "上海",
    price_min_wan: "50",
    price_max_wan: "300",
    sort: "price_asc",
    page: "2",
  });
  assert.deepEqual(query, {
    equipmentType: "gpu_server",
    conditionType: "used",
    region: "上海",
    priceMinWan: 50,
    priceMaxWan: 300,
    sort: "price_asc",
    page: 2,
    pageSize: 12,
  });
  assert.equal(
    buildEquipmentMarketHref(query),
    "/equipment-market?equipment_type=gpu_server&condition_type=used&region=%E4%B8%8A%E6%B5%B7&price_min_wan=50&price_max_wan=300&sort=price_asc&page=2",
  );
  // 非法/未知参数回落到默认值; 默认查询生成裸路径
  assert.deepEqual(parseEquipmentQuery({equipment_type: "yacht", sort: "hack", page: "-1"}), defaultEquipmentQuery);
  assert.equal(buildEquipmentMarketHref(defaultEquipmentQuery), "/equipment-market");
});

it("maps the backend wire product to the display model with 万-based pricing", () => {
  // 买家侧线格式: 无 vendor_id, 只有脱敏后的 vendor_name
  const wire: EquipmentWire = {
    id: 4, vendor_name: "上海***有限公司", title: "NVIDIA A100 SXM 8-GPU 整机", equipment_type: "gpu_server",
    brand: "浪潮", model: "NF5488A5", condition_type: "used", manufacture_year: 2022,
    usage_desc: "满载运行约 2.5 年", quantity: 16, unit_price: 680_000_00, price_negotiable: false,
    region: "上海", description: "支持线下验货", images: null, status: "active",
    created_at: "2026-09-10T10:00:00+08:00",
  };
  const item = mapEquipmentProduct(wire);
  assert.equal(item.priceLabel, "¥68万");
  assert.equal(item.conditionLabel, "二手");
  assert.equal(item.typeLabel, "GPU 服务器");
  assert.equal(item.unitLabel, "台");
  assert.equal(item.unitPriceMinor, 680_000_00);
  assert.equal(item.supplierName, "上海***有限公司");
  assert.equal(item.rejectedReason, undefined);
  // 供应方/运营侧: 驳回原因透传
  const rejected = mapEquipmentProduct({...wire, vendor_name: undefined, vendor_id: 9, status: "draft", rejected_reason: "二手设备未填写检测结论"});
  assert.equal(rejected.rejectedReason, "二手设备未填写检测结论");
  assert.equal(rejected.supplierName, undefined);
  // 面议与小额价格
  assert.equal(formatEquipmentPrice(0, true), "面议");
  assert.equal(formatEquipmentPrice(1_800_00, false), "¥1,800");
  assert.equal(formatEquipmentPrice(2_485_000_00, false), "¥248.5万");
});

it("parses 万元 price ranges tolerantly and rejects invalid input", () => {
  assert.deepEqual(parseWanRange(""), {priceMinWan: null, priceMaxWan: null});
  assert.deepEqual(parseWanRange("50-300"), {priceMinWan: 50, priceMaxWan: 300});
  assert.deepEqual(parseWanRange("¥50万 - 300万"), {priceMinWan: 50, priceMaxWan: 300});
  assert.deepEqual(parseWanRange("50"), {priceMinWan: 50, priceMaxWan: null});
  assert.deepEqual(parseWanRange("-300"), {priceMinWan: null, priceMaxWan: 300});
  assert.equal(parseWanRange("300-50"), null);
  assert.equal(parseWanRange("abc"), null);
  assert.equal(formatWanRange(50, 300), "50-300");
  assert.equal(formatWanRange(null, null), "");
});

it("fetches the market list through the authenticated BFF with 万→分 conversion", async () => {
  const wire: EquipmentWire = {
    id: 1, vendor_name: "", title: "冷板液冷 CDU 机组", equipment_type: "cooling",
    brand: "维谛", model: "Liebert XDU", condition_type: "new", manufacture_year: null,
    usage_desc: "", quantity: 20, unit_price: 0, price_negotiable: true,
    region: "上海", description: "", images: null, status: "active",
    created_at: "2026-09-08T10:00:00+08:00",
  };
  const page = await fetchEquipmentMarket(
    {...defaultEquipmentQuery, conditionType: "new", priceMinWan: 50, priceMaxWan: 300},
    async (url) => {
      const parsed = new URL(String(url), "http://localhost");
      assert.equal(parsed.pathname, "/api/equipments");
      assert.equal(parsed.searchParams.get("condition_type"), "new");
      assert.equal(parsed.searchParams.get("price_min"), "50000000");
      assert.equal(parsed.searchParams.get("price_max"), "300000000");
      return Response.json({code: 0, message: "success", data: {list: [wire], total: 1, page: 1, page_size: 12}});
    },
  );
  assert.equal(page.total, 1);
  assert.equal(page.items[0]?.priceLabel, "面议");
  // 业务失败与鉴权失败都以 message 透出
  await assert.rejects(
    fetchEquipmentMarket(defaultEquipmentQuery, async () => Response.json({code: 40100, message: "未登录"}, {status: 401})),
    /未登录/,
  );
});

it("submits equipment inquiries through the BFF and surfaces business errors", async () => {
  const input = {quantity: 4, contact_name: "测试联系人", contact_phone: "18800001001", message: "【期望交付】2-4 周\n需含安装"};
  assert.deepEqual(
    await submitEquipmentInquiry("15", input, async (url, init) => {
      assert.equal(url, "/api/equipments/15/inquiries");
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), input);
      return Response.json({code: 0, data: {id: 88, note: "线下跟进"}});
    }),
    {id: 88, note: "线下跟进"},
  );
  await assert.rejects(
    submitEquipmentInquiry("15", input, async () => Response.json({code: 40001, message: "询价数量不能超过商品挂牌数量 12"})),
    /询价数量不能超过/,
  );
  await assert.rejects(
    submitEquipmentInquiry("15", input, async () => Response.json({code: 0, data: {id: 88}}, {status: 500})),
  );
});
