import { notFound } from "next/navigation";

import { ContentProvider } from "@/components/content/ContentProvider";
import { Bar } from "@/components/sections/Bar";
import { Booking } from "@/components/sections/Booking";
import { Events } from "@/components/sections/Events";
import { Fire } from "@/components/sections/Fire";
import { Hero } from "@/components/sections/Hero";
import { House } from "@/components/sections/House";
import { Reviews } from "@/components/sections/Reviews";
import { getDictionary, isLocale } from "@/messages";
import { getInitialContent } from "@/lib/server-content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const content = await getInitialContent(locale);

  return (
    <ContentProvider locale={locale} initialData={content}>
      <Hero dict={dict} locale={locale} />
      <House dict={dict} />
      <Fire dict={dict} />
      <Reviews dict={dict} locale={locale} />
      <Bar dict={dict} locale={locale} />
      <Events dict={dict} />
      <Booking dict={dict} locale={locale} />
    </ContentProvider>
  );
}
