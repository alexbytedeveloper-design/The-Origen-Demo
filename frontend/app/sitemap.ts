import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/api";
import { languageAlternates } from "@/lib/seo";
import { locales } from "@/messages";

/**
 * El sitemap se genera en el build. `lastModified` refleja ese momento: no
 * cambiamos la fecha en cada petición para no enviar señales falsas a Google.
 */
const BUILD_DATE = new Date();

function entry(
  suffix: string,
  priority: number,
  changeFrequency: "weekly" | "yearly",
): MetadataRoute.Sitemap[number][] {
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${suffix}`,
    lastModified: BUILD_DATE,
    changeFrequency,
    priority,
    alternates: { languages: languageAlternates(suffix) },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entry("", 1, "weekly"),
    ...entry("/menu", 0.9, "weekly"),
    ...entry("/legal/privacidad", 0.3, "yearly"),
    ...entry("/legal/creditos", 0.3, "yearly"),
  ];
}
