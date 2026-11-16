import type { MetadataRoute } from "next";

import { locales } from "@/messages";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();

  const home = locales.map((locale) => ({
    url: `${SITE}/${locale}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: 1,
  }));

  const menu = locales.map((locale) => ({
    url: `${SITE}/${locale}/menu`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const legal = locales.flatMap((locale) =>
    ["privacidad", "creditos"].map((slug) => ({
      url: `${SITE}/${locale}/legal/${slug}`,
      lastModified: updated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  );

  return [...home, ...menu, ...legal];
}
