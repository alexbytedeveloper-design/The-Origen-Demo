import { describe, expect, it } from "vitest";

import { dictionaries, getDictionary, isLocale, localeNames, locales } from "@/messages";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function leaves(value: Json, path = ""): Map<string, string> {
  const found = new Map<string, string>();
  if (typeof value === "string") {
    found.set(path, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      for (const [key, text] of leaves(item, `${path}[${index}]`)) {
        found.set(key, text);
      }
    });
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      for (const [nested, text] of leaves(item, path ? `${path}.${key}` : key)) {
        found.set(nested, text);
      }
    }
  }
  return found;
}

describe("message dictionaries", () => {
  it("ships exactly the four supported locales", () => {
    expect(locales).toEqual(["es", "en", "fr", "ru"]);
    expect(Object.keys(dictionaries).sort()).toEqual(["en", "es", "fr", "ru"]);
    expect(Object.keys(localeNames)).toHaveLength(4);
  });

  it("recognises only real locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("falls back to Spanish for an unknown locale", () => {
    expect(getDictionary("de" as never)).toBe(dictionaries.es);
  });

  it.each(locales)("%s has the same required structure as Spanish", (locale) => {
    const base = leaves(dictionaries.es as unknown as Json);
    const target = leaves(dictionaries[locale] as unknown as Json);

    // ``guestForms`` puede traer categorías extra (ruso distingue few/many),
    // pero ninguna cadena obligatoria puede faltar.
    const required = [...base.keys()].filter(
      (key) => !key.includes(".guestForms."),
    );
    for (const key of required) {
      expect(target.has(key), key).toBe(true);
    }
    for (const key of target.keys()) {
      expect(
        key.includes(".guestForms.") || base.has(key),
        `clave inesperada ${key}`,
      ).toBe(true);
    }
  });

  it.each(locales)("%s has no empty or placeholder copy", (locale) => {
    const entries = leaves(dictionaries[locale] as unknown as Json);
    for (const [key, value] of entries) {
      // El prefijo de fecha queda vacío a propósito en los idiomas que
      // escriben la fecha sin etiqueta.
      if (key === "reviews.datePrefix") continue;
      expect(value.trim(), key).not.toBe("");
      expect(value, key).not.toMatch(/lorem ipsum|\bTODO\b|\bFIXME\b|placeholder/i);
    }
  });

  it.each(locales)("%s no longer calls the restaurant 'La Casa'", (locale) => {
    const entries = leaves(dictionaries[locale] as unknown as Json);
    for (const [key, value] of entries) {
      expect(value, key).not.toMatch(/la casa|the house|la maison|этот дом/i);
    }
  });
});

describe("menu wording", () => {
  it("calls the menu by its real name in each language", () => {
    expect(dictionaries.es.menu.pageTitle).toBe("Menú");
    expect(dictionaries.en.menu.pageTitle).toBe("Menu");
    expect(dictionaries.fr.menu.pageTitle).toBe("Carte");
    expect(dictionaries.ru.menu.pageTitle).toBe("Меню");
  });

  it("uses the same short label in the navigation", () => {
    for (const locale of locales) {
      expect(dictionaries[locale].nav.menu).toBe(
        dictionaries[locale].menu.pageTitle,
      );
    }
  });

  it("keeps the section walkthrough complete", () => {
    for (const locale of locales) {
      const dict = dictionaries[locale];
      expect(dict.nav.house).not.toBe("");
      expect(dict.house.title).not.toBe("");
      expect(dict.fire.items.length).toBe(dictionaries.es.fire.items.length);
      expect(dict.events.recurring.length).toBe(
        dictionaries.es.events.recurring.length,
      );
      expect(dict.menu.indexLabel).not.toBe("");
      expect(dict.menu.chapterWord).not.toBe("");
      expect(dict.reviews.sampleNote).not.toBe("");
    }
  });
});

describe("section headings", () => {
  it("keeps the chosen editorial headings", () => {
    expect(dictionaries.es.house.title).toBe("Un lugar para disfrutar.");
    expect(dictionaries.es.fire.title).toBe(
      "El punto exacto de la carne sobre tu mesa.",
    );
    expect(dictionaries.es.reviews.title).toBe("Siempre se habla al final.");
    expect(dictionaries.es.bar.title).toBe(
      "Detrás de la barra, el tiempo se mide en sorbos.",
    );
    expect(dictionaries.es.events.title).toBe("La noche también suena.");
    expect(dictionaries.es.booking.title).toBe("Una mesa para ti.");
  });

  it.each(locales)("%s translates every section heading", (locale) => {
    const dict = dictionaries[locale];
    for (const title of [
      dict.house.title,
      dict.fire.title,
      dict.reviews.title,
      dict.bar.title,
      dict.events.title,
      dict.booking.title,
    ]) {
      expect(title.trim().length).toBeGreaterThan(6);
    }
  });

  it("keeps the chosen kicker labels and internal titles", () => {
    expect(dictionaries.es.bar.label).toBe("Coctelería");
    expect(dictionaries.es.fire.items.map((item) => item.title)).toEqual([
      "El sello",
      "Lo que trae el día",
      "El punto justo",
    ]);
    expect(
      dictionaries.es.events.recurring.map((item) => item.title),
    ).toContain("Catas y encuentros");
    expect(dictionaries.es.events.monthTitle).toBe("La agenda de noviembre.");
    expect(dictionaries.es.events.habano.title).toBe(
      "Habano, ron y sobremesa.",
    );
  });

  it("avoids the ampersand in the night programme", () => {
    for (const locale of locales) {
      for (const item of dictionaries[locale].events.recurring) {
        expect(item.title).not.toContain("&");
      }
    }
  });
});

describe("restaurant facts in copy", () => {
  it("states the real service hours", () => {
    for (const locale of locales) {
      expect(dictionaries[locale].house.hoursValue).toContain("12:00");
      expect(dictionaries[locale].house.hoursValue).toContain("00:00");
    }
  });

  it("shows the real phone number wherever it appears", () => {
    for (const locale of locales) {
      const dict = dictionaries[locale];
      expect(dict.booking.phoneValue).toBe("+53 50667554");
      expect(dict.house.addressValue).toBe("Calle 3ra entre 24 y 26, Miramar");
      expect(dict.house.instagramValue).toBe("@origen_cuba");
    }
  });

  it("does not invent a founding year", () => {
    for (const locale of locales) {
      expect(dictionaries[locale].house.sealYear).toBe("Cuba");
      expect(dictionaries[locale].house.sealTop).toBe("Miramar");
    }
  });

  it("marks the reviews as samples", () => {
    for (const locale of locales) {
      expect(dictionaries[locale].reviews.sample.length).toBeGreaterThan(0);
      expect(dictionaries[locale].reviews.sampleNote.length).toBeGreaterThan(20);
    }
  });
});
