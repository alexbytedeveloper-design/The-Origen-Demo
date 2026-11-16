import type { Metadata } from "next";

import { ADDRESS, INSTAGRAM_URL, PHONE_TEL } from "@/lib/contact";
import { SITE_URL, type ContentPayload } from "@/lib/api";
import { locales, type Locale } from "@/messages";
import type { Dict } from "@/messages/es";

export const SITE_NAME = "The Origen";
export const THEME_COLOR = "#14100e";

/** Imagen social de respaldo (la principal la genera `opengraph-image.tsx`). */
export const OG_IMAGE = {
  url: "/images/hero-tomahawk.jpg",
  width: 1600,
  height: 1067,
};

const OG_LOCALES: Record<Locale, string> = {
  es: "es_CU",
  en: "en_US",
  fr: "fr_FR",
  ru: "ru_RU",
};

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Alternativas hreflang para un sufijo de ruta (`""`, `"/menu"`, ...). */
export function languageAlternates(suffix = ""): Record<string, string> {
  const clean = suffix === "/" ? "" : suffix;
  const entries = Object.fromEntries(
    locales.map((code) => [code, absoluteUrl(`/${code}${clean}`)]),
  );
  return { ...entries, "x-default": absoluteUrl(`/es${clean}`) };
}

export function openGraphLocale(locale: Locale): string {
  return OG_LOCALES[locale];
}

export function alternateOpenGraphLocales(locale: Locale): string[] {
  return locales
    .filter((code) => code !== locale)
    .map((code) => OG_LOCALES[code]);
}

/**
 * Metadatos comunes de una página localizada.
 *
 * `suffix` es la parte de la ruta que va después del idioma: `""` para la
 * portada, `"/menu"` para la carta, `"/legal/privacidad"` para legales.
 */
export function pageMetadata({
  locale,
  suffix = "",
  title,
  description,
  robots,
}: {
  locale: Locale;
  suffix?: string;
  title: string;
  description: string;
  robots?: Metadata["robots"];
}): Metadata {
  const url = absoluteUrl(`/${locale}${suffix}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(suffix),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: openGraphLocale(locale),
      alternateLocale: alternateOpenGraphLocales(locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(robots ? { robots } : {}),
  };
}

const OPENING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const GALLERY = [
  "/images/hero-tomahawk.jpg",
  "/images/table-evening.jpg",
  "/images/bar-cocktails.jpg",
];

/** Ficha del restaurante para Google, Bing y asistentes. */
export function restaurantJsonLd(
  locale: Locale,
  dict: Dict,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${absoluteUrl(`/${locale}`)}#restaurant`,
    name: SITE_NAME,
    alternateName: "Origen",
    description: dict.meta.description,
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale,
    image: GALLERY.map(absoluteUrl),
    logo: absoluteUrl("/icon.svg"),
    telephone: PHONE_TEL,
    currenciesAccepted: "USD",
    servesCuisine: ["Steakhouse", "Cocktail bar"],
    sameAs: [INSTAGRAM_URL],
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS,
      addressLocality: "La Habana",
      addressRegion: "La Habana",
      addressCountry: "CU",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: OPENING_DAYS,
        opens: "12:00",
        closes: "00:00",
      },
    ],
    hasMenu: absoluteUrl(`/${locale}/menu`),
    acceptsReservations: true,
  };
}

/** Entidad del sitio, con el idioma y la portada de cada locale. */
export function websiteJsonLd(
  locale: Locale,
  dict: Dict,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    description: dict.meta.description,
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale,
    publisher: { "@id": `${absoluteUrl(`/${locale}`)}#restaurant` },
  };
}

/** Carta completa, sección a sección, con precios reales en USD. */
export function menuJsonLd(
  locale: Locale,
  dict: Dict,
  content: ContentPayload | null,
): Record<string, unknown> {
  const sections = content?.menu.sections ?? [];

  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${absoluteUrl(`/${locale}/menu`)}#menu`,
    name: `${dict.menu.pageTitle} — ${SITE_NAME}`,
    description: dict.menu.pageLead,
    url: absoluteUrl(`/${locale}/menu`),
    inLanguage: locale,
    hasMenuSection: sections.map((section) => ({
      "@type": "MenuSection",
      name: section.title,
      ...(section.note ? { description: section.note } : {}),
      hasMenuItem: section.groups.flatMap((group) =>
        group.items.map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "USD",
          },
        })),
      ),
    })),
  };
}

export type Crumb = { name: string; suffix: string };

export function breadcrumbJsonLd(
  locale: Locale,
  crumbs: Crumb[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(`/${locale}${crumb.suffix}`),
    })),
  };
}
