import { describe, expect, it } from "vitest";

import { PHONE_DISPLAY } from "@/lib/contact";
import { photoCredits, privacySections } from "@/lib/legal";
import { locales } from "@/messages";

describe("privacy sections", () => {
  it.each(locales)("%s explains all five points", (locale) => {
    const sections = privacySections[locale];
    expect(sections).toHaveLength(5);
    for (const section of sections) {
      expect(section.heading.trim()).not.toBe("");
      expect(section.body.length).toBeGreaterThan(0);
      for (const paragraph of section.body) {
        expect(paragraph.trim()).not.toBe("");
      }
    }
  });

  it.each(locales)("%s mentions the real phone number", (locale) => {
    const text = privacySections[locale]
      .flatMap((section) => section.body)
      .join(" ");
    expect(text).toContain(PHONE_DISPLAY);
  });

  it("describes the actual technical cookies", () => {
    const text = privacySections.es.map((section) => section.body.join(" ")).join(" ");
    expect(text.toLowerCase()).toContain("sesión");
    expect(text).toContain("CSRF");
    expect(text.toLowerCase()).not.toContain("publicidad personalizada");
  });

  it("does not claim AES-256 for passwords", () => {
    const text = Object.values(privacySections)
      .flat()
      .flatMap((section) => section.body)
      .join(" ")
      .toLowerCase();
    expect(text).toContain("argon2id");
    expect(text).not.toContain("aes-256");
  });
});

describe("photo credits", () => {
  it("lists every photo with its author, license and link", () => {
    expect(photoCredits).toHaveLength(5);
    for (const credit of photoCredits) {
      expect(credit.title.trim()).not.toBe("");
      expect(credit.author.trim()).not.toBe("");
      expect(credit.license).toMatch(/^CC BY-SA \d\.\d$/);
      expect(credit.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });
});
