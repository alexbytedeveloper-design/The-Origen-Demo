import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentProvider } from "@/components/content/ContentProvider";
import { MenuPageView } from "@/components/menu/MenuPageView";
import { getDictionary, isLocale, locales } from "@/messages";

type MenuPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = getDictionary(locale);

  return {
    title: `${dict.menu.pageTitle} — The Origen`,
    description: dict.menu.pageLead,
    alternates: {
      canonical: `/${locale}/menu`,
      languages: Object.fromEntries(
        locales.map((code) => [code, `/${code}/menu`]),
      ),
    },
  };
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return (
    <ContentProvider locale={locale}>
      <MenuPageView dict={dict} locale={locale} />
    </ContentProvider>
  );
}
