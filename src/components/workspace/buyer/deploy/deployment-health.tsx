"use client";

import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";
import {SectionQueryState} from "@/components/managed/query-states";
import {fetchDeploymentHealth, healthRanges, type HealthRange} from "@/lib/model-deploy";

import {deployKeys} from "./deploy-keys";
import {MetricChart} from "./metric-chart";

const rangeCopy: Record<HealthRange, string> = {"1h": "近 1 小时", "24h": "近 24 小时", "7d": "近 7 天"};

/**
 * Health sample series (docs/27 §27.5.4). GPU memory usage is deliberately not charted:
 * vLLM pre-allocates it, so capacity pressure is read from KV cache usage and the queue.
 */
export function DeploymentHealth({orderNo, deployNo, live}: {orderNo: string; deployNo: string; live: boolean}) {
  const [range, setRange] = useState<HealthRange>("1h");
  const query = useQuery({
    queryKey: deployKeys.health(orderNo, deployNo, range),
    queryFn: () => fetchDeploymentHealth(orderNo, deployNo, range),
    refetchInterval: live ? 60_000 : false,
    retry: false,
  });
  const samples = query.data ?? [];
  const longRange = range !== "1h";

  return (
    <div className="space-y-4">
      <OptionChips
        items={healthRanges.map((value) => ({value, label: rangeCopy[value]}))}
        label="时间范围（1 小时为 60 秒原始点，24 小时为 5 分钟均值，7 天为 1 小时均值）"
        value={range}
        onChange={setRange}
      />
      <SectionQueryState
        emptyText="该时段暂无健康采样。部署进入运行中后每 60 秒采样一次。"
        error={query.error}
        isEmpty={samples.length === 0}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取健康采样"
        notOpenText="健康采样接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <MetricChart longRange={longRange} samples={samples} title="首字延迟 TTFT" unit="ms" series={[
            {key: "ttft_p50_ms", label: "P50", color: "#2f7fb5"},
            {key: "ttft_p95_ms", label: "P95", color: "#d9822b"},
          ]} />
          <MetricChart longRange={longRange} samples={samples} title="吞吐" unit="tokens/s" series={[
            {key: "gen_tokens_per_s", label: "生成", color: "#2f7fb5"},
            {key: "prompt_tokens_per_s", label: "预填充", color: "#6b9e5a"},
          ]} />
          <MetricChart longRange={longRange} samples={samples} title="请求数" unit="个" series={[
            {key: "requests_running", label: "运行中", color: "#2f7fb5"},
            {key: "requests_waiting", label: "排队", color: "#c0392b"},
          ]} />
          <MetricChart domain={[0, 100]} longRange={longRange} samples={samples} title="KV 缓存占用" unit="%" series={[
            {key: "kv_usage_pct", label: "KV 占用", color: "#7b5ea7"},
          ]} />
          <MetricChart longRange={longRange} samples={samples} title="卡温度（最高）" unit="°C" series={[
            {key: "gpu_temp_max_c", label: "温度", color: "#c0392b"},
          ]} />
          <MetricChart longRange={longRange} samples={samples} title="探针请求耗时" unit="ms" series={[
            {key: "canary_ms", label: "耗时", color: "#173447"},
          ]} />
        </div>
      </SectionQueryState>
    </div>
  );
}
