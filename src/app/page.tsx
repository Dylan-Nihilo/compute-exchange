"use client";

import {Card, Chip} from "@heroui/react";

export default function HomePage() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <section className="flex w-full max-w-xl flex-col gap-6">
        <Chip className="w-fit" color="warning" variant="soft">
          服务准备中
        </Chip>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            算力撮合交易平台
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted sm:text-lg">
            合规算力交易与 AI Token 服务即将开放。
          </p>
        </div>

        <Card role="status">
          <Card.Header>
            <Card.Title>真实交易尚未开放</Card.Title>
            <Card.Description>
              平台将在资质、支付与安全条件齐备后分阶段开放服务。
            </Card.Description>
          </Card.Header>
        </Card>
      </section>
    </main>
  );
}
