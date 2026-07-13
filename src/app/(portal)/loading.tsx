"use client";

import {Spinner} from "@heroui/react";

export default function Loading() {
  return (
    <main className="grid min-h-[70vh] place-items-center" aria-label="正在加载">
      <Spinner size="lg">正在加载</Spinner>
    </main>
  );
}
