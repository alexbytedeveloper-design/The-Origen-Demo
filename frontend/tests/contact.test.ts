import { describe, expect, it } from "vitest";

import {
  ADDRESS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PHONE_DISPLAY,
  PHONE_TEL,
  WHATSAPP_NUMBER,
  whatsappUrl,
} from "@/lib/contact";

describe("restaurant contact details", () => {
  it("keeps the real phone number in every format", () => {
    expect(PHONE_DISPLAY).toBe("+53 50667554");
    expect(PHONE_TEL).toBe("+5350667554");
    expect(WHATSAPP_NUMBER).toBe("5350667554");
  });

  it("keeps the Miramar address", () => {
    expect(ADDRESS).toBe("Calle 3ra entre 24 y 26, Miramar");
  });

  it("points at the official Instagram account", () => {
    expect(INSTAGRAM_HANDLE).toBe("@origen_cuba");
    expect(INSTAGRAM_URL).toBe("https://www.instagram.com/origen_cuba/");
  });
});

describe("whatsappUrl", () => {
  it("opens WhatsApp with the encoded message", () => {
    const url = whatsappUrl("Mesa para 2 · 20:00");
    expect(url.startsWith("https://wa.me/5350667554?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Mesa para 2 · 20:00"));
  });

  it("does not leave line breaks or quotes raw", () => {
    const url = whatsappUrl('Hola\n"mesa"');
    expect(url).not.toContain("\n");
    expect(url).not.toContain('"');
    expect(url.split("?text=")).toHaveLength(2);
  });

  it("supports an empty message", () => {
    expect(whatsappUrl("")).toBe("https://wa.me/5350667554?text=");
  });
});
