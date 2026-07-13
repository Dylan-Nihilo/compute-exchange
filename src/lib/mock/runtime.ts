const DEFAULT_LATENCY_MS = 240;

interface MockRuntimeState {
  latencyMs: number;
  nextFailure: string | null;
}

const state: MockRuntimeState = {
  latencyMs: DEFAULT_LATENCY_MS,
  nextFailure: null,
};

export function setMockLatency(latencyMs: number) {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) {
    throw new RangeError("Mock latency must be a non-negative number");
  }
  state.latencyMs = latencyMs;
}

export function failNextMockOperation(message = "模拟服务暂时不可用") {
  state.nextFailure = message;
}

export function resetMockRuntime() {
  state.latencyMs = DEFAULT_LATENCY_MS;
  state.nextFailure = null;
}

export function getMockRuntimeState(): Readonly<MockRuntimeState> {
  return {...state};
}

export async function runMockOperation<T>(operation: () => T | Promise<T>) {
  if (state.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, state.latencyMs));
  }

  const failure = state.nextFailure;
  state.nextFailure = null;
  if (failure) throw new Error(failure);

  return operation();
}
