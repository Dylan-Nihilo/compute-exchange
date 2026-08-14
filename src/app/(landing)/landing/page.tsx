import type {Metadata} from "next";

import {BusinessCapabilitiesSection} from "@/components/landing/business-capabilities-section";
import {HeroSection} from "@/components/landing/hero/hero-section";
import {LandingFooter} from "@/components/landing/landing-footer";
import {MarketPreviewSection} from "@/components/landing/market-preview-section";
import {NetworkSection} from "@/components/landing/network-section";
import {PartnersSection} from "@/components/landing/partners-section";
import {PublicHeader} from "@/components/layout/public-header";
import {RouteTransition} from "@/components/layout/route-transition";

export const metadata: Metadata = {
  title: {absolute: "万象硅芯 OmniS · 合规算力，一站式撮合与交付"},
  description:
    "连接合规机构与企业需求，支持 GPU 算力分时租赁、包月与灵活订单交付。",
};

export default function LandingPage() {
  return (
    <RouteTransition>
      <main className="overflow-x-clip bg-cs-canvas text-cs-ink">
        <PublicHeader />
        <HeroSection />
        <BusinessCapabilitiesSection />
        <NetworkSection />
        <PartnersSection />
        <MarketPreviewSection />
        <LandingFooter />
      </main>
    </RouteTransition>
  );
}
