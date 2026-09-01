"use client";

import {MorphIcon} from "morphicons/react";
import type {ComponentProps} from "react";

export function InteractiveIcon(props: ComponentProps<typeof MorphIcon>) {
  return (
    <MorphIcon
      reducedMotion="user"
      spring="snappy"
      strokeWidth={2}
      {...props}
    />
  );
}
