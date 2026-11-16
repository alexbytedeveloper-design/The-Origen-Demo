import { describe, expect, it } from "vitest";

import type { ContentPayload } from "@/lib/api";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  languageAlternates,
  menuJsonLd,
  pageMetadata,
  restaurantJsonLd,
} from "@/lib/seo";
import { getDictionary, locales } from "@/messages";
import type { Locale } from "@/messages";

const SITE = "http://localhost:3000";

const content: ContentPayload = {
  locale: "es",
  menu: {
    note: "Precios en USD, impuestos incluidos.",
    sections: [
      {
        id: "cocteleria",
        title: "Coctelería",
        groups: [
          {
            id: "autor",
            title: "Coctelería de Autor",
            items: [
              {
                name: "El Bodegón",
                description: "Caramelo, piña y coco.",
                price: 5,
              },
            ],
          },
        ],
      },
    ],
  },
  reviews: [],
  signature: [],
  updatedAt: "2026-11-16T00:00:00Z",
};

describe("SEO helpers", () => {
  it("builds absolute URLs without duplicating slashes", () => {
    expect(absoluteUrl()).toBe(`${SITE}/`);
    expect(absoluteUrl("es")).toBe(`${SITE}/es`);
    expect(absoluteUrl("/es/menu")).toBe(`${SITE}/es/menu`);
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("declares hreflang for every locale plus x-default", () => {
    const languages = languageAlternates("/menu");

    for (const locale of locales) {
      expect(languages[locale]).toBe(`${SITE}/${locale}/menu`);
    }
    expect(languages["x-default"]).toBe(`${SITE}/es/menu`);
  });

  it("returns canonical, hreflang and social tags per page", () => {
    const meta = pageMetadata({
      locale: "fr",
      suffix: "/menu",
      title: "Carte",
      description: "Cocktails et pierre chaude.",
    });

    expect(meta.alternates?.canonical).toBe(`${SITE}/fr/menu`);
    expect(meta.openGraph).toMatchObject({
      siteName: "The Origen",
      locale: "fr_FR",
      url: `${SITE}/fr/menu`,
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("describes the restaurant with the real phone, address and Instagram", () => {
    const restaurant = restaurantJsonLd("es", getDictionary("es")) as {
      telephone: string;
      address: { streetAddress: string; addressCountry: string };
      sameAs: string[];
      openingHoursSpecification: { opens: string; closes: string }[];
      hasMenu: string;
    };

    expect(restaurant.telephone).toBe("+5350667554");
    expect(restaurant.address.streetAddress).toBe(
      "Calle 3ra entre 24 y 26, Miramar",
    );
    expect(restaurant.address.addressCountry).toBe("CU");
    expect(restaurant.sameAs).toContain("https://www.instagram.com/origen_cuba/");
    expect(restaurant.openingHoursSpecification[0]).toMatchObject({
      opens: "12:00",
      closes: "00:00",
    });
    expect(restaurant.hasMenu).toBe(`${SITE}/es/menu`);
  });

  it("serialises every menu item with its USD price", () => {
    const menu = menuJsonLd("es", getDictionary("es"), content) as {
      hasMenuSection: {
        name: string;
        hasMenuItem: { name: string; offers: { price: number; priceCurrency: string } }[];
      }[];
    };

    expect(menu.hasMenuSection).toHaveLength(1);
    expect(menu.hasMenuSection[0].name).toBe("Coctelería");
    expect(menu.hasMenuSection[0].hasMenuItem[0]).toMatchObject({
      name: "El Bodegón",
      offers: { price: 5, priceCurrency: "USD" },
    });
  });

  it("numbers breadcrumb items in order", () => {
    const crumbs = breadcrumbJsonLd("en" as Locale, [
      { name: "The Origen", suffix: "" },
      { name: "Menu", suffix: "/menu" },
    ]) as {
      itemListElement: { position: number; item: string }[];
    };

    expect(crumbs.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(crumbs.itemListElement[1].item).toBe(`${SITE}/en/menu`);
  });
});
