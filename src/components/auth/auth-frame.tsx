import Link from "next/link";

export function AuthFrame({children}: {children: React.ReactNode}) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(22rem,0.82fr)_minmax(32rem,1.18fr)]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface-secondary px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <Link
          className="w-fit text-sm font-semibold tracking-[0.18em] text-foreground"
          href="/"
        >
          COMPUTE EXCHANGE
        </Link>
        <div className="max-w-lg pb-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
            可信算力基础设施
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-foreground xl:text-5xl">
            连接算力供给、交易与交付
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">
            一个账户管理算力采购、资源供给、设备协作与融资服务。
          </p>
        </div>
        <p className="text-xs text-muted">合规交易 · 履约留痕 · 多身份协同</p>
      </aside>
      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
        <div className="w-full max-w-md">
          <Link
            className="mb-10 inline-flex text-xs font-semibold tracking-[0.16em] text-foreground lg:hidden"
            href="/"
          >
            COMPUTE EXCHANGE
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
