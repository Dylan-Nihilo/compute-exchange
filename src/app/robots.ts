import type {MetadataRoute} from "next";

import {SITE_URL} from "../lib/site.ts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth",
        "/admin",
        "/console",
        "/checkout",
        "/market",
        "/equipment-market",
        "/broker",
        "/supplier",
        "/dev/",
        "/unauthorized",
        "/attestations/verify",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
