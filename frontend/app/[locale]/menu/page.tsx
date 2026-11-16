import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentProvider } from "@/components/content/ContentProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { MenuPageView } from "@/components/menu/MenuPageView";
import {
  breadcrumbJsonLd,
  menuJsonLd,
  pageMetadata,
  SITE_NAME,
} from "@/lib/seo";
import { getInitialContent } from "@/lib/server-content";
import { getDictionary, isLocale } from "@/messages";

type MenuPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = getDictionary(locale);

  return pageMetadata({
    locale,
    suffix: "/menu",
    title: dict.menu.pageTitle,
    description: dict.menu.pageLead,
  });
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const content = await getInitialContent(locale);

  return (
    <ContentProvider locale={locale} initialData={content}>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: SITE_NAME, suffix: "" },
            { name: dict.menu.pageTitle, suffix: "/menu" },
          ]),
          menuJsonLd(locale, dict, content),
        ]}
      />
      <MenuPageView dict={dict} locale={locale} />
    </ContentProvider>
  );
}
