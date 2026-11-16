import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { locales } from "@/messages";

const SITE = "http://localhost:3000";

describe("metadata routes", () => {
  it("lists every locale, menu and legal page in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    for (const locale of locales) {
      expect(urls).toContain(`${SITE}/${locale}`);
      expect(urls).toContain(`${SITE}/${locale}/menu`);
      expect(urls).toContain(`${SITE}/${locale}/legal/privacidad`);
      expect(urls).toContain(`${SITE}/${locale}/legal/creditos`);
    }

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((url) => url.endsWith("/menu"))).toHaveLength(
      locales.length,
    );
  });

  it("keeps the API out of the crawlers and points to the sitemap", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    expect(rules[0]?.allow).toBe("/");
    expect(rules[0]?.disallow).toContain("/backend/");
    expect(rules[0]?.disallow).toContain("/api/");
    expect(config.sitemap).toBe(`${SITE}/sitemap.xml`);
  });

  it("declares hreflang alternates for every sitemap entry", () => {
    const home = sitemap().find((entry) => entry.url === `${SITE}/es`);

    expect(home?.alternates?.languages?.["es"]).toBe(`${SITE}/es`);
    expect(home?.alternates?.languages?.["ru"]).toBe(`${SITE}/ru`);
    expect(home?.alternates?.languages?.["x-default"]).toBe(`${SITE}/es`);
  });

  it("declares an installable manifest with the real theme", () => {
    const config = manifest();

    expect(config.name).toBe("The Origen");
    expect(config.start_url).toBe("/es");
    expect(config.scope).toBe("/");
    expect(config.lang).toBe("es");
    expect(config.theme_color).toBe("#14100e");
    expect(config.icons?.[0]?.src).toBe("/icon.svg");
  });
});
