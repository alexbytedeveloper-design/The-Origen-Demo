import { ImageResponse } from "next/og";

import { ADDRESS } from "@/lib/contact";
import { SITE_NAME } from "@/lib/seo";
import { getDictionary, isLocale } from "@/messages";

/**
 * Tarjeta social 1200×630. Se genera en el build para cada idioma y usa la
 * misma paleta que el sitio: fondo tinta, texto crema y latón.
 */
export const alt =
  "The Origen — piedra caliente, coctelería y cocina de mercado en Miramar, La Habana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "es");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14100e",
          color: "#f3ece1",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 12,
            color: "#d8b25a",
            textTransform: "uppercase",
          }}
        >
          {SITE_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            {dict.hero.headline}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              color: "#cdbfa8",
            }}
          >
            {dict.hero.place}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#cdbfa8",
          }}
        >
          <div style={{ display: "flex" }}>{ADDRESS}</div>
          <div style={{ display: "flex" }}>12:00–00:00</div>
        </div>
      </div>
    ),
    size,
  );
}
