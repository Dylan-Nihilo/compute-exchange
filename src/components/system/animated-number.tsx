"use client";

import NumberFlow, {NumberFlowGroup, type Format} from "@number-flow/react";
import {useLayoutEffect, useRef, useState} from "react";

export {NumberFlowGroup as AnimatedNumberGroup};

const transformTiming: EffectTiming = {
  duration: 350,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};
const opacityTiming: EffectTiming = {
  duration: 180,
  easing: "ease-out",
};

export function AnimatedNumber({
  animateOnMount = true,
  className,
  format,
  prefix,
  suffix,
  value,
}: {
  animateOnMount?: boolean;
  className?: string;
  format?: Format;
  prefix?: string;
  suffix?: string;
  value: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useLayoutEffect(() => {
    if (value !== previousValue.current) {
      previousValue.current = value;
      setDisplayValue(value);
      return;
    }
    if (
      !animateOnMount ||
      value === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    setDisplayValue(0);
    const frame = window.requestAnimationFrame(() => setDisplayValue(value));
    return () => window.cancelAnimationFrame(frame);
  }, [animateOnMount, value]);

  return (
    <NumberFlow
      className={`tabular-nums ${className ?? ""}`}
      format={format}
      isolate
      locales="zh-CN"
      opacityTiming={opacityTiming}
      prefix={prefix}
      spinTiming={transformTiming}
      suffix={suffix}
      transformTiming={transformTiming}
      value={displayValue}
    />
  );
}
