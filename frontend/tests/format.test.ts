import { describe, expect, it } from "vitest";

import { addDaysISO, formatLongDate, formatPrice, guestsLabel, todayISO } from "@/lib/format";

describe("formatPrice", () => {
  it("uses dollars with two decimals regardless of the locale", () => {
    expect(formatPrice(2.5, "es")).toBe("$2.50");
    expect(formatPrice(12, "ru")).toBe("$12.00");
    expect(formatPrice(0.1 + 0.2, "fr")).toBe("$0.30");
  });
});

describe("formatLongDate", () => {
  it("renders a readable date in the requested language", () => {
    expect(formatLongDate("2026-11-15", "es")).toContain("2026");
    expect(formatLongDate("2026-11-15", "en")).toContain("November");
    expect(formatLongDate("2026-11-15", "fr")).toContain("novembre");
  });

  it("returns the raw value when the date is invalid", () => {
    expect(formatLongDate("no-es-fecha", "es")).toBe("no-es-fecha");
  });

  it("does not shift the day for timezones behind UTC", () => {
    for (const locale of ["es", "en", "fr", "ru"]) {
      expect(formatLongDate("2026-01-01", locale)).toContain("2026");
    }
  });
});

describe("guestsLabel", () => {
  const forms = { one: "persona", other: "personas" };

  it("picks the singular form for one guest", () => {
    expect(guestsLabel(1, "es", forms)).toBe("persona");
  });

  it("picks the plural form for several guests", () => {
    expect(guestsLabel(2, "es", forms)).toBe("personas");
    expect(guestsLabel(8, "en", forms)).toBe("personas");
  });

  it("falls back to the other form when the language has extra categories", () => {
    expect(guestsLabel(2, "ru", { one: "гость", few: "гостя", other: "гостей" })).toBe(
      "гостя",
    );
    expect(guestsLabel(5, "ru", { one: "гость", few: "гостя", other: "гостей" })).toBe(
      "гостей",
    );
  });

  it("uses the fallback when a category is missing", () => {
    expect(guestsLabel(2, "ru", forms)).toBe("personas");
  });
});

describe("date helpers", () => {
  it("returns ISO dates with two-digit months and days", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDaysISO(3)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps the local calendar day instead of the UTC one", () => {
    const today = new Date(`${todayISO()}T12:00:00`);
    const tomorrow = new Date(`${addDaysISO(1)}T12:00:00`);
    expect(tomorrow.getTime() - today.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
