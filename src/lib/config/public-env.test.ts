import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {parsePublicEnv} from "./public-env.ts";

describe("public environment", () => {
  it("accepts an optional HTTP API base URL", () => {
    assert.deepEqual(parsePublicEnv({}), {});
    assert.deepEqual(
      parsePublicEnv({
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/v1",
      }),
      {
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com/v1",
      },
    );
    assert.throws(
      () => parsePublicEnv({NEXT_PUBLIC_API_BASE_URL: "file:///tmp/api"}),
      /HTTP\(S\)/,
    );
  });
});
