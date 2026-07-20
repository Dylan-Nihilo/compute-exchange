import Link from "next/link";

const footerGroups = [
  {
    label: "平台",
    links: [
      ["算力市场", "/market"],
      ["业务模块", "/#modules"],
    ],
  },
  {
    label: "合作",
    links: [
      ["成为伙伴", "/auth/register"],
      ["资源入驻", "/auth/register"],
    ],
  },
  {
    label: "支持",
    links: [
      ["平台网络", "/#network"],
      ["合规说明", "/#network"],
    ],
  },
  {
    label: "联系",
    links: [
      ["合作与咨询", "/auth/register"],
      ["关于 ComputeSpot", "/"],
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer
      className="bg-[linear-gradient(143deg,var(--color-cs-footer-start)_40%,var(--color-cs-footer-end)_100%)] text-white"
      aria-labelledby="footer-cta-title"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] pb-10 pt-20 lg:pb-11 lg:pt-[6.875rem]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2
              id="footer-cta-title"
              className="font-display text-[2.75rem] leading-[1.1] tracking-[-0.045em] sm:text-[3.875rem]"
            >
              找到下一块合适的算力
            </h2>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              从需求提交到资源交付，用一套清晰流程完成。
            </p>
          </div>

          <Link
            href="/market"
            className="inline-flex h-[3.375rem] w-fit min-w-[11.875rem] items-center justify-center rounded-full bg-cs-footer-action px-7 text-sm font-semibold text-cs-footer-action-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            进入算力市场
          </Link>
        </div>

        <div className="mt-14 border-t border-white/20 pt-10 lg:mt-14">
          <nav aria-label="页脚导航" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ComputeSpot. All rights reserved.</p>
          <p>ICP / EDI 资质办理中 · 合规经营服务平台</p>
        </div>
      </div>
    </footer>
  );
}
