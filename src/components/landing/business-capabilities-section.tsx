import Image from "next/image";
import Link from "next/link";

const PRIMARY_CAPABILITIES = [
  {
    title: "算力现货撮合",
    description:
      "合规机构资源，实时比价、撮合与交付，让企业快速获得可用算力。",
    action: "进入算力市场 →",
    href: "/market",
    image: "/compute-spot/business-market.png",
    featured: true,
  },
  {
    title: "AI Token 工厂",
    description: "为大模型部署、Token 智能服务与推理业务提供稳定算力。",
    action: "查看 Token 服务 →",
    href: "/#network",
    image: "/compute-spot/business-token.png",
  },
] as const;

const SECONDARY_CAPABILITIES = [
  {
    title: "设备整包销售",
    description: "服务器、GPU 与数据中心设备采购。",
    action: "了解更多 →",
    href: "/auth/register",
    image: "/compute-spot/business-hardware.png",
  },
  {
    title: "组网与机电安装服务",
    description: "机房规划、配电、制冷与工程项目整合。",
    action: "登记项目 →",
    href: "/auth/register",
    image: "/compute-spot/business-engineering.png",
  },
  {
    title: "融资租赁",
    description: "为持续算力需求提供灵活的资产解决方案。",
    action: "提交需求 →",
    href: "/auth/register",
    image: "/compute-spot/business-finance.png",
  },
] as const;

type Capability = {
  title: string;
  description: string;
  action: string;
  href: string;
  image: string;
  featured?: boolean;
};

function CapabilityCard({
  capability,
  size,
}: {
  capability: Capability;
  size: "primary" | "secondary";
}) {
  const isPrimary = size === "primary";

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.25rem] border bg-[#f7fafd] ${
        isPrimary
          ? "h-[15rem] lg:h-[17.5rem]"
          : "h-[11.875rem]"
      } ${
        capability.featured
          ? "border-[#b9d13a]/20 shadow-[0_16px_36px_rgba(6,37,59,0.08)]"
          : "border-[#d6e1e8]/20"
      }`}
    >
      <Image
        src={capability.image}
        alt=""
        fill
        sizes={isPrimary ? "(min-width: 1024px) 45vw, 90vw" : "(min-width: 1024px) 30vw, 90vw"}
        className={`object-cover transition-transform duration-500 group-hover:scale-[1.015] ${
          capability.featured ? "" : "opacity-90 blur-[4px]"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          capability.featured ? "bg-[#f7fafd]/34" : "bg-[#f7fafd]/20"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          capability.featured
            ? "bg-[linear-gradient(90deg,rgba(247,250,253,0.98)_0%,rgba(247,250,253,0.9)_34%,rgba(247,250,253,0.38)_55%,rgba(247,250,253,0)_72%)]"
            : "bg-[linear-gradient(90deg,rgba(247,250,253,0.96)_0%,rgba(247,250,253,0.84)_34%,rgba(247,250,253,0.22)_58%,rgba(247,250,253,0)_76%)]"
        }`}
      />

      <div
        className={`absolute inset-0 z-10 flex flex-col items-start px-8 ${
          isPrimary ? "pt-[4.25rem] pb-[3.65rem]" : "pt-[2.25rem] pb-[2.05rem]"
        }`}
      >
        <h3
          className={`font-semibold tracking-[-0.045em] text-[#17201f] ${
            isPrimary ? "text-[1.4375rem]" : "text-lg"
          }`}
        >
          {capability.title}
        </h3>
        <p className="mt-3 max-w-[27rem] text-[0.8125rem] leading-[1.75] text-[#717b76]">
          {capability.description}
        </p>
        <Link
          href={capability.href}
          className="mt-auto text-[0.6875rem] font-semibold text-[#17201f] outline-none transition-opacity hover:opacity-60 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cs-ink/45"
        >
          {capability.action}
        </Link>
      </div>
    </article>
  );
}

export function BusinessCapabilitiesSection() {
  return (
    <section id="modules" aria-labelledby="business-capabilities-title" className="bg-white text-cs-ink">
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] py-20 lg:w-[90%]">
        <div className="flex min-h-[4.688rem] items-end">
          <h2
            id="business-capabilities-title"
            className="text-[clamp(2rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em] text-[#17201f]"
          >
            从算力交易，到交付完成
          </h2>
        </div>

        <div className="mt-[2.375rem] grid gap-4 lg:grid-cols-2">
          {PRIMARY_CAPABILITIES.map((capability) => (
            <CapabilityCard
              key={capability.title}
              capability={capability}
              size="primary"
            />
          ))}
        </div>

        <div className="mt-3.5 grid gap-4 lg:grid-cols-3">
          {SECONDARY_CAPABILITIES.map((capability) => (
            <CapabilityCard
              key={capability.title}
              capability={capability}
              size="secondary"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
