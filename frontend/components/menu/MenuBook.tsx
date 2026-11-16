"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { formatPrice } from "@/lib/format";
import type {
  ContentPayload,
  MenuGroup,
  MenuSectionData,
} from "@/lib/api";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Cada capítulo abre con una foto. No hay fotografía real del local todavía,
 * así que se reutilizan las cinco imágenes del demo y se alternan.
 */
const CHAPTER_PHOTOS: Record<string, string> = {
  cocteleria: "/images/bar-cocktails.jpg",
  entrantes: "/images/table-evening.jpg",
  sugerencias: "/images/hero-tomahawk.jpg",
  principales: "/images/dry-aging.jpg",
  postres: "/images/table-evening.jpg",
  cafe: "/images/bar-old-fashioned.jpg",
};

function Group({
  group,
  locale,
  showTitle,
}: {
  group: MenuGroup;
  locale: Locale;
  showTitle: boolean;
}) {
  return (
    <div className="menu-group">
      {showTitle && (
        <div className="menu-group__head">
          <h4 className="menu-group__title">{group.title}</h4>
          <span className="menu-group__rule" aria-hidden="true" />
        </div>
      )}

      {group.note && <p className="menu-group__note">{group.note}</p>}

      <dl style={{ margin: 0 }}>
        {group.items.map((dish) => (
          <div className="dish" key={`${group.id}-${dish.name}`}>
            <div className="dish__head">
              <dt className="dish__name">{dish.name}</dt>
              <span className="dish__dots" aria-hidden="true" />
              <dd className="dish__price" style={{ margin: 0 }}>
                {formatPrice(dish.price, locale)}
              </dd>
            </div>
            {dish.description && (
              <dd className="dish__desc">{dish.description}</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

function Chapter({
  section,
  index,
  locale,
  dict,
}: {
  section: MenuSectionData;
  index: number;
  locale: Locale;
  dict: Dict;
}) {
  const single = section.groups.length === 1;
  const number = String(index + 1).padStart(2, "0");
  const photo = CHAPTER_PHOTOS[section.id] ?? "/images/table-evening.jpg";

  return (
    <article className="menu-chapter" id={`carta-${section.id}`}>
      <figure className="menu-chapter__figure">
        <Image
          src={photo}
          alt={dict.menu.photoAlt}
          width={1600}
          height={900}
          sizes="(max-width: 1100px) 100vw, 72vw"
          className="menu-chapter__photo"
        />
        <span className="menu-chapter__veil" aria-hidden="true" />

        <figcaption className="menu-chapter__caption">
          <span className="menu-chapter__kicker">
            <span className="menu-chapter__num" aria-hidden="true">
              {number}
            </span>
            {dict.menu.chapterWord}
          </span>
          <h3 className="menu-chapter__title">{section.title}</h3>
          {section.note && (
            <p className="menu-chapter__note">{section.note}</p>
          )}
        </figcaption>
      </figure>

      <div className="menu-chapter__paper">
        <div
          className={`menu-chapter__groups${single ? " is-single" : ""}`}
        >
          {section.groups.map((group) => (
            <Group
              group={group}
              locale={locale}
              showTitle={!single}
              key={group.id}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="menu-skeleton" aria-hidden="true">
      {[0, 1].map((card) => (
        <div className="menu-skeleton__card" key={card}>
          <span className="sk sk--title" />
          {[0, 1, 2, 3].map((line) => (
            <span
              className="sk sk--line"
              key={line}
              style={{ width: `${100 - (line % 3) * 9}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MenuBook({
  status,
  data,
  retry,
  dict,
  locale,
}: {
  status: Status;
  data: ContentPayload | null;
  retry: () => void;
  dict: Dict;
  locale: Locale;
}) {
  const [active, setActive] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!data) return;
    const nodes = data.menu.sections
      .map((section) => document.getElementById(`carta-${section.id}`))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setActive(visible.target.id.replace("carta-", ""));
        }
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.2, 0.5, 0.8] },
    );

    nodes.forEach((node) => observer.observe(node));
    setActive((current) => current ?? data.menu.sections[0]?.id ?? null);
    return () => observer.disconnect();
  }, [data]);

  useEffect(() => {
    if (!active || !railRef.current) return;

    const link = railRef.current.querySelector<HTMLElement>(
      ".menu-rail__link.is-active",
    );
    if (!link) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    link.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  if (status === "error") {
    return (
      <div className="menu-error" role="alert">
        <p>{dict.menu.error}</p>
        <button type="button" className="btn btn--ghost" onClick={retry}>
          {dict.menu.retry}
        </button>
      </div>
    );
  }

  if (status === "idle" || status === "loading" || !data) {
    return (
      <div className="menu-loading">
        <Skeleton />
        <p className="sr-only" role="status">
          {dict.menu.loading}
        </p>
      </div>
    );
  }

  const sections = data.menu.sections;
  const activeIndex = sections.findIndex((section) => section.id === active);
  const progress =
    activeIndex >= 0 ? ((activeIndex + 1) / sections.length) * 100 : 0;

  return (
    <div className="menu-book">
      <nav className="menu-rail" aria-label={dict.menu.navLabel} ref={railRef}>
        <p className="menu-rail__title">{dict.menu.indexLabel}</p>
        <div className="menu-rail__progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <ol className="menu-rail__list">
          {sections.map((section, index) => {
            const isActive = active === section.id;

            return (
              <li key={section.id}>
                <a
                  className={`menu-rail__link${isActive ? " is-active" : ""}`}
                  href={`#carta-${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                >
                  <span className="menu-rail__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="menu-rail__label">{section.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <a className="menu-rail__top" href="#carta-inicio">
          {dict.menu.topLabel}
        </a>
      </nav>

      <div className="menu-chapters">
        {sections.map((section, index) => (
          <Chapter
            section={section}
            index={index}
            locale={locale}
            dict={dict}
            key={section.id}
          />
        ))}

        <div className="menu__foot">
          <p>{data.menu.note ?? dict.menu.note}</p>
          <div className="menu__actions">
            <a className="btn btn--brass" href={`/${locale}#reservas`}>
              {dict.menu.book}
            </a>
            <a className="link" href={`/${locale}`}>
              {dict.menu.backHome}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
