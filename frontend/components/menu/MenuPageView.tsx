"use client";

import { Logo } from "@/components/brand/Logo";
import { useContent } from "@/components/content/ContentProvider";
import { useContentOnView } from "@/components/content/useContentOnView";
import { MenuBook } from "@/components/menu/MenuBook";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function MenuPageView({
  dict,
  locale,
}: {
  dict: Dict;
  locale: Locale;
}) {
  const { status, data, retry } = useContent();
  const ref = useContentOnView<HTMLElement>();

  return (
    <section
      className="menu-page"
      id="carta"
      ref={ref}
      aria-busy={status === "loading"}
    >
      <div className="menu-page__cover" id="carta-inicio">
        <div className="menu-page__cover-inner" data-reveal>
          <Logo className="menu-page__mark" variant="mark" decorative />

          <p className="menu-page__kicker">{dict.menu.label}</p>
          <h1 className="menu-page__title">{dict.menu.pageTitle}</h1>
          <p className="menu-page__lead">{dict.menu.pageLead}</p>

          <span className="menu-page__ornament" aria-hidden="true">
            <span />
          </span>

          <p className="menu-page__meta">
            {dict.menu.priceNote}
            <span aria-hidden="true"> · </span>
            Miramar, La Habana
          </p>
        </div>

        <a className="menu-page__cue" href="#carta-cocteleria">
          <span aria-hidden="true" />
          {dict.menu.indexLabel}
        </a>
      </div>

      <div className="menu-page__stage">
        <div className="container container--wide">
          <MenuBook
            status={status}
            data={data}
            retry={retry}
            dict={dict}
            locale={locale}
          />
        </div>
      </div>
    </section>
  );
}
