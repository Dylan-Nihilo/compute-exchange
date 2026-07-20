import Image from "next/image";

const PARTNERS = [
  {name: "Grow", position: "left-[3.1%] top-[-58%]"},
  {name: "Harbour Studio", position: "left-[-88.1%] top-[-61.4%]"},
  {name: "EventRise", position: "left-[-186.7%] top-[-255.7%]"},
  {name: "wised", position: "left-[3.1%] top-[-448.9%]"},
  {name: "Prismis", position: "left-[-88.1%] top-[-258%]"},
  {
    name: "Magic Media Productions",
    position: "left-[-186.7%] top-[-448.9%]",
  },
  {name: "depove", position: "left-[3.1%] top-[-634.1%]"},
  {name: "Opal", position: "left-[-88.1%] top-[-453.4%]"},
  {name: "roctop", position: "left-[-186.7%] top-[-636.4%]"},
] as const;

export function PartnersSection() {
  return (
    <section
      id="partners"
      aria-labelledby="partners-title"
      className="bg-surface text-foreground"
    >
      <div className="mx-auto grid w-[calc(100%-3rem)] max-w-[81rem] gap-12 py-20 lg:grid-cols-[30rem_minmax(0,1fr)] lg:gap-[5.625rem] lg:py-28">
        <div>
          <h2
            id="partners-title"
            className="text-[clamp(2.5rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em]"
          >
            <span className="block">与可靠伙伴，</span>
            <span className="block">共同交付</span>
          </h2>
          <p className="mt-[2.375rem] max-w-[26.25rem] text-[0.9375rem] leading-[1.65] text-muted">
            连接合规机构、设备厂商、支付与产业服务伙伴，形成可持续的算力供应链。
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {PARTNERS.map((partner) => (
            <li
              key={partner.name}
              className="relative aspect-[113/44] overflow-hidden rounded-[1.125rem] border border-border bg-black"
            >
              <Image
                src="/compute-spot/partners-demo.png"
                alt={partner.name}
                width={658}
                height={877}
                className={`pointer-events-none absolute h-[996.6%] w-[291.2%] max-w-none select-none ${partner.position}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
