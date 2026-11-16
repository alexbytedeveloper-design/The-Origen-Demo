import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { getDictionary, isLocale } from "@/messages";
import { photoCredits, privacySections } from "@/lib/legal";
import { breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";

type LegalPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

const slugs = ["privacidad", "creditos"] as const;
type Slug = (typeof slugs)[number];

function isSlug(value: string): value is Slug {
  return (slugs as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSlug(slug)) return {};

  const dict = getDictionary(locale);
  const privacy = slug === "privacidad";

  return pageMetadata({
    locale,
    suffix: `/legal/${slug}`,
    title: privacy ? dict.legal.privacyTitle : dict.legal.creditsTitle,
    description: privacy ? dict.legal.privacyIntro : dict.legal.creditsIntro,
    robots: { index: true, follow: true },
  });
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSlug(slug)) notFound();

  const dict = getDictionary(locale);

  return (
    <article className="legal">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: SITE_NAME, suffix: "" },
          {
            name:
              slug === "privacidad"
                ? dict.legal.privacyTitle
                : dict.legal.creditsTitle,
            suffix: `/legal/${slug}`,
          },
        ])}
      />
      <div className="container">
        <p className="eyebrow">The Origen</p>
        <h1 className="section__title">
          {slug === "privacidad" ? dict.legal.privacyTitle : dict.legal.creditsTitle}
        </h1>

        <div className="legal__body">
          {slug === "privacidad" && (
            <>
              <p>{dict.legal.privacyIntro}</p>
              {privacySections[locale].map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </>
          )}

          {slug === "creditos" && (
            <>
              <p>{dict.legal.creditsIntro}</p>
              <ul className="credit-list">
                {photoCredits.map((credit) => (
                  <li key={credit.title}>
                    <span className="credit-list__title">{credit.title}</span>
                    <span>{credit.author}</span>
                    <a href={credit.licenseUrl} rel="license noopener noreferrer" target="_blank">
                      {credit.license}
                    </a>
                  </li>
                ))}
              </ul>
              <p>
                <a href="https://commons.wikimedia.org/" rel="noopener noreferrer" target="_blank">
                  Wikimedia Commons
                </a>
              </p>
            </>
          )}

          <p style={{ marginTop: 40 }}>
            <a className="link" href={`/${locale}`}>
              {dict.legal.back}
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
