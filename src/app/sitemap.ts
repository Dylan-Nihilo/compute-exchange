import type {MetadataRoute} from "next";

import {legalDocuments} from "../lib/legal.ts";
import {SITE_URL} from "../lib/site.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", ...Object.keys(legalDocuments)].map((path) => ({
    url: `${SITE_URL}/${path}`,
  }));
}
