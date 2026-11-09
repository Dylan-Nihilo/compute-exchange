export const catalogKeys = {
  all: ["admin", "model-catalog"] as const,
  list: () => ["admin", "model-catalog", "list"] as const,
  detail: (id: number) => ["admin", "model-catalog", "detail", id] as const,
};
