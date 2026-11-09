export const deployKeys = {
  all: (orderNo: string) => ["buyer", "orders", "deployments", orderNo] as const,
  list: (orderNo: string) => ["buyer", "orders", "deployments", orderNo, "list"] as const,
  detail: (orderNo: string, deployNo: string) => ["buyer", "orders", "deployments", orderNo, "detail", deployNo] as const,
  health: (orderNo: string, deployNo: string, range: string) =>
    ["buyer", "orders", "deployments", orderNo, "health", deployNo, range] as const,
  plans: (orderNo: string, modelId: number) => ["buyer", "orders", "deployments", orderNo, "plans", modelId] as const,
  models: ["market", "models"] as const,
};
