import type {Metadata} from "next";

import {ComputeAdvisor} from "@/components/agent/compute-advisor";
import {BusinessCapabilitiesSection} from "@/components/landing/business-capabilities-section";
import {FaqSection} from "@/components/landing/faq-section";
import {HeroSection} from "@/components/landing/hero/hero-section";
import {LandingFooter} from "@/components/landing/landing-footer";
import {MarketPreviewSection} from "@/components/landing/market-preview-section";
import {NetworkSection} from "@/components/landing/network-section";
import {PartnersSection} from "@/components/landing/partners-section";
import {PublicHeader} from "@/components/layout/public-header";
import {SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_URL} from "@/lib/site";
import "@/components/landing/fonts.css";

const title = "万象硅芯 OmniS · 合规算力，一站式撮合与交付";

export const metadata: Metadata = {
  title: {absolute: title},
  description: SITE_DESCRIPTION,
  alternates: {canonical: "/"},
  openGraph: {
    type: "website",
    title,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "zh_CN",
    images: [SITE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE.url],
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/omnis/OmniS-logo-horizontal-color.png`,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "zh-CN",
      publisher: {"@id": `${SITE_URL}/#organization`},
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      name: title,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: "zh-CN",
      isPartOf: {"@id": `${SITE_URL}/#website`},
      about: {"@id": `${SITE_URL}/#organization`},
      mainEntity: {"@id": `${SITE_URL}/#faq`},
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c")}}
      />
      <PublicHeader />
      <main className="overflow-x-clip bg-cs-canvas text-cs-ink">
        <HeroSection />
        <BusinessCapabilitiesSection />
        <NetworkSection />
        <PartnersSection />
        <MarketPreviewSection />
        <FaqSection />
        <LandingFooter />
      </main>
      <ComputeAdvisor />
    </div>
  );
}
