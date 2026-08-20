import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  filterMarketSupplies,
  marketPaginationItems,
  marketSupplies,
  paginateMarketSupplies,
  sortMarketSupplies,
  formatMarketPriceRange,
  parseMarketPriceRange,
} from "./market-data.ts";

describe("market browsing", () => {
  it("combines search and structured filters", () => {
    const results = filterMarketSupplies(marketSupplies, {
      query: "训练",
      gpuModel: "H100",
      region: "乌兰察布",
      deliveryMode: "container",
      productType: "card_rental",
      pricingMode: "hourly",
      availableHours: "全天",
      priceMin: 10,
      priceMax: 20,
      cardCountMin: 32,
    });

    assert.deepEqual(results.map(({id}) => id), ["supply-h100-64"]);
  });

  it("paginates filtered supplies and clamps an invalid page", () => {
    const firstPage = paginateMarketSupplies(marketSupplies, 1, 5);
    const lastPage = paginateMarketSupplies(marketSupplies, 99, 5);

    assert.equal(firstPage.items.length, 5);
    assert.equal(firstPage.totalPages, 3);
    assert.equal(lastPage.page, 3);
    assert.equal(lastPage.items.length, 2);
  });

  it("sorts price and stock while keeping negotiable prices last", () => {
    assert.equal(sortMarketSupplies(marketSupplies, "price_asc")[0]?.id, "supply-4090-24");
    assert.equal(sortMarketSupplies(marketSupplies, "stock_desc")[0]?.id, "supply-h20-128");
  });

  it("keeps pagination controls bounded for large result sets", () => {
    assert.deepEqual(marketPaginationItems(50, 100), [1, "ellipsis", 49, 50, 51, "ellipsis", 100]);
  });

  it("parses the single-field price range used by the market filters", () => {
    assert.deepEqual(parseMarketPriceRange("¥20–50 / 卡·时"), {
      priceMin: 20,
      priceMax: 50,
    });
    assert.deepEqual(parseMarketPriceRange("20-"), {
      priceMin: 20,
      priceMax: null,
    });
    assert.equal(parseMarketPriceRange("50-20"), null);
    assert.equal(formatMarketPriceRange(20, 50), "¥20–50");
  });
});
