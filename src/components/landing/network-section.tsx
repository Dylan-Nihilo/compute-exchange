import Image from "next/image";

import {NetworkBackground} from "./network-background";

/**
 * Ecosystem network section (Figma frame 373:586, 1440x867).
 * Desktop renders the Figma absolute layout inside a 16:9 canvas sized
 * with container query units so every node scales with the canvas;
 * mobile falls back to a stacked hub + grid over the same motion glow.
 */

const SATELLITES = [
  {
    key: "token",
    title: "Token服务",
    subtitle: "模型/API/推理",
    icon: "/compute-spot/network-token.svg",
    position: "left-[28.1%] top-[20.9%]",
  },
  {
    key: "enterprise",
    title: "企业需求",
    subtitle: "研发/推理/训练",
    icon: "/compute-spot/network-enterprise.svg",
    position: "left-[6%] top-[51.6%]",
  },
  {
    key: "compliance",
    title: "合规机构",
    subtitle: "资源/交付/运营",
    icon: "/compute-spot/network-compliance.svg",
    position: "left-[73.4%] top-[42.2%]",
  },
  {
    key: "finance",
    title: "金融与设备",
    subtitle: "租赁/工程/资产",
    icon: "/compute-spot/network-finance.svg",
    position: "left-[60.2%] top-[78.6%]",
  },
] as const;

type Satellite = (typeof SATELLITES)[number];

function SatelliteBadge({icon, sizeClass}: {icon: string; sizeClass: string}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-[#d9e3ef] bg-[radial-gradient(circle_at_43%_37%,#ffffff_25%,#e7edf4_100%)] ${sizeClass}`}
    >
      <Image src={icon} alt="" width={46} height={46} className="size-3/5" />
    </span>
  );
}

function DesktopSatellite({satellite}: {satellite: Satellite}) {
  return (
    <div
      className={`absolute flex items-center gap-[1.41cqw] ${satellite.position}`}
    >
      <SatelliteBadge icon={satellite.icon} sizeClass="size-[8.55cqw]" />
      <span className="flex flex-col gap-[0.47cqw] whitespace-nowrap text-[#07385e]">
        <span className="text-[1.72cqw] font-medium leading-[1.64cqw]">
          {satellite.title}
        </span>
        <span className="text-[1.09cqw] leading-[1.64cqw]">
          {satellite.subtitle}
        </span>
      </span>
    </div>
  );
}

function DesktopCanvas() {
  return (
    <div className="@container relative hidden aspect-[16/9] lg:block">
      <div className="absolute left-[41.25%] top-[46.1%] flex w-[16.9%] flex-col items-center gap-[0.94cqw] text-center text-[#07385e]">
        <Image
          src="/compute-spot/network-center.svg"
          alt=""
          width={60}
          height={60}
          className="size-[4.69cqw]"
        />
        <p className="whitespace-nowrap text-[3.44cqw] font-medium leading-[3.28cqw]">
          撮合中心
        </p>
        <p className="text-[2.19cqw] leading-[1.5]">算力/交付/服务</p>
      </div>
      {SATELLITES.map((satellite) => (
        <DesktopSatellite key={satellite.key} satellite={satellite} />
      ))}
    </div>
  );
}

function MobileCanvas() {
  return (
    <div className="relative flex flex-col items-center gap-10 px-6 py-12 lg:hidden">
      <div className="flex flex-col items-center gap-2 text-center text-[#07385e]">
        <Image
          src="/compute-spot/network-center.svg"
          alt=""
          width={60}
          height={60}
          className="size-12"
        />
        <p className="text-2xl font-medium">撮合中心</p>
        <p className="text-sm">算力/交付/服务</p>
      </div>
      <ul className="grid w-full max-w-md grid-cols-1 gap-x-8 gap-y-5 min-[26rem]:grid-cols-2">
        {SATELLITES.map((satellite) => (
          <li key={satellite.key} className="flex items-center gap-3">
            <SatelliteBadge icon={satellite.icon} sizeClass="size-12" />
            <span className="flex flex-col gap-0.5 text-[#07385e]">
              <span className="text-sm font-medium">{satellite.title}</span>
              <span className="text-xs">{satellite.subtitle}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NetworkSection() {
  return (
    <section
      id="network"
      aria-labelledby="network-title"
      className="bg-[#f9f9f9] text-cs-ink"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] py-20 lg:w-[90%]">
        <div className="flex min-h-[4.688rem] items-end">
          <h2
            id="network-title"
            className="text-[clamp(2rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em] text-[#17201f]"
          >
            连接算力，也连接价值
          </h2>
        </div>

        <div className="relative mt-[2.375rem] overflow-hidden rounded-[1.25rem]">
          <NetworkBackground />
          <DesktopCanvas />
          <MobileCanvas />
        </div>
      </div>
    </section>
  );
}
