"use client";

import {Card, Link, Surface, Typography} from "@heroui/react";

export function AuthFrame({children}: {children: React.ReactNode}) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(22rem,0.82fr)_minmax(32rem,1.18fr)]">
      <Surface
        className="relative hidden overflow-hidden border-r border-border px-10 py-12 lg:flex lg:flex-col lg:justify-between"
        variant="secondary"
      >
        <Link
          className="w-fit text-sm font-semibold tracking-[0.08em] text-foreground"
          href="/"
        >
          算力交易平台
        </Link>
        <div className="max-w-lg pb-12">
          <Typography
            className="tracking-[0.16em]"
            color="muted"
            type="body-xs"
            weight="medium"
          >
            可信算力基础设施
          </Typography>
          <Typography className="mt-5 text-4xl tracking-[-0.04em] xl:text-5xl" type="h2">
            连接算力供给、交易与交付
          </Typography>
          <Typography className="mt-6 max-w-md leading-7" color="muted" type="body">
            一个账户管理算力采购、资源供给、设备协作与融资服务。
          </Typography>
        </div>
        <Typography color="muted" type="body-xs">
          合规交易 · 履约留痕 · 多身份协同
        </Typography>
      </Surface>
      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
        <Card className="w-full max-w-xl rounded-3xl">
          <Card.Content className="p-6 sm:p-8">
            <Link
              className="mb-10 inline-flex text-xs font-semibold tracking-[0.08em] text-foreground lg:hidden"
              href="/"
            >
              算力交易平台
            </Link>
            {children}
          </Card.Content>
        </Card>
      </section>
    </main>
  );
}
