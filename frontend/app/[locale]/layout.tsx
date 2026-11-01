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
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(site),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      type: "website",
      siteName: "The Origen",
      title: dict.meta.title,
      description: dict.meta.description,
      locale,
      url: `/${locale}`,
      images: [{ url: "/images/hero-tomahawk.jpg", width: 1600, height: 1067, alt: dict.hero.photoAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: { index: true, follow: true },
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
