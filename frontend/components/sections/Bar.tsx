"use client";

import Image from "next/image";
import { SectionHead } from "@/components/ui/SectionHead";
import { useContent } from "@/components/content/ContentProvider";
import { useContentOnView } from "@/components/content/useContentOnView";
import { formatPrice } from "@/lib/format";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Bar({ dict, locale }: { dict: Dict; locale: Locale }) {
  const { status, data, retry } = useContent();
  const ref = useContentOnView<HTMLElement>();
  const drinks = data?.signature ?? [];

  return (
    <section className="section bar" id="barra" ref={ref}>
      <div className="container">
        <div className="bar__grid">
          <figure className="bar__figure" data-reveal>
            <Image
              src="/images/bar-cocktails.jpg"
              alt={dict.bar.photoAlt}
              width={1200}
              height={800}
              sizes="(max-width: 1080px) 90vw, 42vw"
              className="bar__photo"
            />
          </figure>

          <div data-reveal data-delay="1">
            <SectionHead
              index="04"
              label={dict.bar.label}
              title={dict.bar.title}
              titleClass="bar__title"
            />
            <p className="bar__copy">{dict.bar.copy}</p>

            <div className="bar__list" aria-busy={status === "loading"}>
              {status === "ready" &&
                drinks.map((drink) => (
                  <div className="bar__item" key={drink.name}>
                    <span>{drink.name}</span>
                    <span className="dish__dots" aria-hidden="true" />
                    <span className="dish__price">{formatPrice(drink.price, locale)}</span>
                  </div>
                ))}

              {(status === "idle" || status === "loading") &&
                [0, 1, 2].map((row) => (
                  <div className="bar__item" key={row} aria-hidden="true">
                    <span className="sk sk--line sk--light" style={{ width: `${46 + row * 6}%` }} />
                  </div>
                ))}

              {status === "error" && (
                <p className="bar__error">
                  {dict.menu.error}{" "}
                  <button type="button" className="reviews__retry" onClick={retry}>
                    {dict.menu.retry}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
