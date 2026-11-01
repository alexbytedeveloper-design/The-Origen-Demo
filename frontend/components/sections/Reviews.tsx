"use client";

import Image from "next/image";
import { SectionHead } from "@/components/ui/SectionHead";
import { useContent } from "@/components/content/ContentProvider";
import { useContentOnView } from "@/components/content/useContentOnView";
import { formatLongDate } from "@/lib/format";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Reviews({ dict, locale }: { dict: Dict; locale: Locale }) {
  const { status, data, retry } = useContent();
  const ref = useContentOnView<HTMLElement>();
  const reviews = data?.reviews ?? [];

  return (
    <section className="section section--dark reviews" id="resenas" ref={ref}>
      <div className="reviews__bg" aria-hidden="true">
        <Image
          src="/images/table-evening.jpg"
          alt=""
          fill
          sizes="100vw"
          className="reviews__photo"
        />
      </div>

      <div className="container">
        <div data-reveal>
          <SectionHead
            index="03"
            label={dict.reviews.label}
            title={dict.reviews.title}
            lead={dict.reviews.lead}
          />
        </div>

        {status === "ready" && reviews.length > 0 && (
          <div className="review-grid">
            {reviews.map((review, index) => (
              <figure
                className="review"
                key={`${review.author}-${review.date}`}
                data-reveal
                data-delay={index > 0 ? String(index) : undefined}
              >
                {review.sample && (
                  <span className="review__sample">{dict.reviews.sample}</span>
                )}
                <blockquote className="review__quote" style={{ margin: 0 }}>
                  {review.quote}
                </blockquote>
                <figcaption className="review__author">
                  {review.author}
                  {" · "}
                  {formatLongDate(review.date, locale)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {status === "ready" && reviews.some((review) => review.sample) && (
          <p className="reviews__sample-note">{dict.reviews.sampleNote}</p>
        )}

        {(status === "idle" || status === "loading") && (
          <div className="review-grid" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div className="review" key={item}>
                <span className="sk sk--line sk--light" style={{ width: "72%" }} />
                <span className="sk sk--line sk--light" />
                <span className="sk sk--line sk--light" style={{ width: "86%" }} />
                <span className="sk sk--line sk--light" style={{ width: "44%", marginTop: 26 }} />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <p className="reviews__error">
            {dict.menu.error}{" "}
            <button type="button" className="reviews__retry" onClick={retry}>
              {dict.menu.retry}
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
