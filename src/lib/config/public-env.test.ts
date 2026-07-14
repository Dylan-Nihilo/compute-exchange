import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {parsePublicEnv} from "./public-env.ts";

describe("public environment", () => {
  it("requires an API base URL only for the HTTP data source", () => {
    assert.deepEqual(parsePublicEnv({NEXT_PUBLIC_DATA_SOURCE: "mock"}), {
      NEXT_PUBLIC_DATA_SOURCE: "mock",
    });
    assert.throws(
      () => parsePublicEnv({NEXT_PUBLIC_DATA_SOURCE: "http"}),
      /NEXT_PUBLIC_API_BASE_URL/,
    );
    assert.deepEqual(
      parsePublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/v1",
        NEXT_PUBLIC_DATA_SOURCE: "http",
      }),
      {
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/v1",
        NEXT_PUBLIC_DATA_SOURCE: "http",
      },
    );
  });
});
