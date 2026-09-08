import {Chip} from "@heroui/react";
import type {MarketSupply} from "./market-data";

export function ProductHealth({health}: {health: MarketSupply["health"]}) {
  if (!health || health === "unknown") return null;
  return (
    <Chip color={health === "healthy" ? "success" : health === "degraded" ? "warning" : "default"} size="sm" variant="soft">
      {health === "healthy" ? "节点在线" : health === "degraded" ? "部分节点异常" : "暂不可下单"}
    </Chip>
  );
}
