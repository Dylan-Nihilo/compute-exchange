import type {Metadata} from "next";

import {BusinessCapabilitiesSection} from "@/components/landing/business-capabilities-section";
import {HeroNav} from "@/components/landing/hero/hero-nav";
import {HeroSection} from "@/components/landing/hero/hero-section";

export const metadata: Metadata = {
  title: {absolute: "ComputeSpot · 合规算力，一站式撮合与交付"},
  description:
    "连接合规机构与企业需求，支持 GPU 算力分时租赁、包月与灵活订单交付。",
};

export default function LandingPage() {
  return (
    <main className="bg-cs-canvas text-cs-ink">
      <HeroNav />
      <HeroSection />
      <BusinessCapabilitiesSection />
    </main>
  );
}
