import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { RevealObserver } from "@/components/RevealObserver";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SITE_URL } from "@/lib/api";
import {
  absoluteUrl,
  alternateOpenGraphLocales,
  languageAlternates,
  openGraphLocale,
  SITE_NAME,
} from "@/lib/seo";
import { getDictionary, isLocale, locales, type Locale } from "@/messages";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// La CSP lleva un nonce por petición: las páginas no pueden ser estáticas.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#14100e",
  colorScheme: "light",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = getDictionary(locale);
  const canonical = absoluteUrl(`/${locale}`);

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: `%s — ${SITE_NAME}` },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    applicationName: SITE_NAME,
    category: "restaurant",
    creator: SITE_NAME,
    publisher: SITE_NAME,
    authors: [{ name: SITE_NAME, url: canonical }],
    alternates: {
      canonical,
      languages: languageAlternates(),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: openGraphLocale(locale),
      alternateLocale: alternateOpenGraphLocales(locale),
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "black-translucent",
    },
    formatDetection: { telephone: true, address: true, email: true },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <html lang={locale}>
      <head>
        <link
          rel="preload"
          href="/fonts/prata-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/golos-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {locale === "ru" && (
          <link
            rel="preload"
            href="/fonts/prata-cyrillic.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <a className="skip" href="#contenido">
          {dict.nav.skip}
        </a>

        <AuthProvider dict={dict}>
          <Header locale={locale as Locale} dict={dict} />
          <main id="contenido">{children}</main>
          <Footer locale={locale as Locale} dict={dict} />
          <FloatingWhatsApp dict={dict} />
          <AuthModal dict={dict} />
        </AuthProvider>

        <RevealObserver />
      </body>
    </html>
  );
}
