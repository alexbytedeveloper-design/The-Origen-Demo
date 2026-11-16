import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { locales, type Locale } from "@/messages";

type Item = { name: string; price: number; description?: string };
type Group = { id: string; title: string; note?: string; items: Item[] };
type Section = { id: string; title: string; note?: string; groups: Group[] };
type Review = {
  quote: string;
  author: string;
  date: string;
  sample?: boolean;
};
type Content = {
  menu: { note?: string; sections: Section[] };
  signature: Item[];
  reviews: Review[];
};

function load(locale: Locale): Content {
  const url = new URL(`../../backend/app/content/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Content;
}

const contents = Object.fromEntries(
  locales.map((locale) => [locale, load(locale)]),
) as Record<Locale, Content>;

function itemsOf(content: Content): Item[] {
  return content.menu.sections.flatMap((section) =>
    section.groups.flatMap((group) => group.items),
  );
}

describe("menu content", () => {
  it("keeps the expected size in every language", () => {
    for (const locale of locales) {
      const content = contents[locale];
      expect(content.menu.sections, locale).toHaveLength(6);
      expect(
        content.menu.sections.flatMap((section) => section.groups),
        locale,
      ).toHaveLength(19);
      expect(itemsOf(content), locale).toHaveLength(92);
      expect(content.signature, locale).toHaveLength(3);
      expect(content.reviews, locale).toHaveLength(6);
    }
  });

  it("uses the same ids and order in every language", () => {
    const base = contents.es;
    for (const locale of locales) {
      const content = contents[locale];
      expect(
        content.menu.sections.map((section) => section.id),
        locale,
      ).toEqual(base.menu.sections.map((section) => section.id));

      for (const [index, section] of content.menu.sections.entries()) {
        expect(
          section.groups.map((group) => group.id),
          `${locale} ${section.id}`,
        ).toEqual(base.menu.sections[index].groups.map((group) => group.id));
        expect(section.groups).toHaveLength(base.menu.sections[index].groups.length);
      }
    }
  });

  it("does not repeat ids", () => {
    for (const locale of locales) {
      const sectionIds = contents[locale].menu.sections.map((section) => section.id);
      expect(new Set(sectionIds).size).toBe(sectionIds.length);

      const groupIds = contents[locale].menu.sections.flatMap((section) =>
        section.groups.map((group) => `${section.id}/${group.id}`),
      );
      expect(new Set(groupIds).size).toBe(groupIds.length);
    }
  });

  it("keeps dish names in Spanish across translations", () => {
    const base = itemsOf(contents.es);
    for (const locale of locales) {
      const items = itemsOf(contents[locale]);
      expect(items.map((item) => item.name), locale).toEqual(
        base.map((item) => item.name),
      );
    }
  });

  it("has a title for every section and group", () => {
    for (const locale of locales) {
      for (const section of contents[locale].menu.sections) {
        expect(section.title.trim(), `${locale} ${section.id}`).not.toBe("");
        for (const group of section.groups) {
          expect(
            group.title.trim(),
            `${locale} ${section.id}/${group.id}`,
          ).not.toBe("");
          expect(group.items.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("prices every dish with a positive amount", () => {
    for (const locale of locales) {
      for (const item of itemsOf(contents[locale])) {
        expect(Number.isFinite(item.price), `${locale} ${item.name}`).toBe(true);
        expect(item.price, `${locale} ${item.name}`).toBeGreaterThan(0);
        expect(item.price, `${locale} ${item.name}`).toBeLessThan(1000);
      }
    }
  });

  it("does not smuggle markup into the copy", () => {
    for (const locale of locales) {
      const strings = [
        ...itemsOf(contents[locale]).flatMap((item) => [
          item.name,
          item.description ?? "",
        ]),
        ...contents[locale].reviews.flatMap((review) => [
          review.quote,
          review.author,
        ]),
      ];
      for (const value of strings) {
        expect(value, locale).not.toMatch(/<script|<iframe|javascript:/i);
      }
    }
  });

  it("labels every review as a sample with a valid date", () => {
    for (const locale of locales) {
      for (const review of contents[locale].reviews) {
        expect(review.sample, locale).toBe(true);
        expect(review.quote.trim()).not.toBe("");
        expect(review.author.trim()).not.toBe("");
        expect(review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(review.date))).toBe(false);
      }
    }
  });

  it("keeps the signature dishes consistent across languages", () => {
    const base = contents.es.signature.map((item) => item.name);
    for (const locale of locales) {
      expect(contents[locale].signature.map((item) => item.name)).toEqual(base);
    }
  });
});
