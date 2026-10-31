"use client";

import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

import type {HealthSample} from "@/lib/model-deploy";

export type MetricSeries = {key: keyof HealthSample; label: string; color: string};

const timeFormat = new Intl.DateTimeFormat("zh-CN", {hour: "2-digit", minute: "2-digit", hour12: false});
const dayFormat = new Intl.DateTimeFormat("zh-CN", {month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false});

/** One small line chart over health samples; null points render as gaps (no interpolation). */
export function MetricChart({title, unit, samples, series, longRange, domain}: {
  title: string;
  unit: string;
  samples: readonly HealthSample[];
  series: readonly MetricSeries[];
  longRange: boolean;
  domain?: [number, number];
}) {
  const hasData = samples.some((sample) => series.some((item) => typeof sample[item.key] === "number"));
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : (longRange ? dayFormat : timeFormat).format(date);
  };
  return (
    <figure className="min-w-0 rounded-xl border border-border p-3">
      <figcaption className="mb-2 text-xs font-medium text-muted">{title}（{unit}）</figcaption>
      {hasData ? (
        <div className="h-44">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={[...samples]} margin={{top: 4, right: 8, bottom: 0, left: -12}}>
              <CartesianGrid stroke="#e3ebef" strokeDasharray="3 3" />
              <XAxis dataKey="t" fontSize={10} minTickGap={24} tickFormatter={format} />
              <YAxis domain={domain ?? ["auto", "auto"]} fontSize={10} width={44} />
              <Tooltip labelFormatter={(label) => format(String(label))} />
              {series.length > 1 ? <Legend iconSize={8} wrapperStyle={{fontSize: 11}} /> : null}
              {series.map((item) => (
                <Line
                  dataKey={item.key}
                  dot={false}
                  isAnimationActive={false}
                  key={item.key}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={1.6}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="flex h-44 items-center justify-center text-xs text-muted">该时段暂无数据</p>
      )}
    </figure>
  );
}
