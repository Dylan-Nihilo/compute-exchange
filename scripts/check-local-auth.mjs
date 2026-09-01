const capBase =
  process.env.NEXT_PUBLIC_CAP_API_ENDPOINT ??
  "http://127.0.0.1:3210/local-dev/";
const authBase =
  process.env.AUTH_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1";

const checks = [
  ["Cap", new URL("challenge", capBase), {method: "POST"}],
  ["Go auth backend", new URL("/health", authBase), undefined],
];

const results = await Promise.all(
  checks.map(async ([name, url, init]) => {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      console.error(
        `[local-auth] ${name} unavailable at ${url}: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }),
);

if (!results.every(Boolean)) {
  console.error("[local-auth] Start the workspace backend, then retry.");
  process.exit(1);
}

console.log("[local-auth] Cap and Go auth backend are ready.");
