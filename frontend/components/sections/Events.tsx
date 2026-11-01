import { whatsappUrl } from "@/lib/contact";
import { SectionHead } from "@/components/ui/SectionHead";
import type { Dict } from "@/messages/es";

export function Events({ dict }: { dict: Dict }) {
  const events = dict.events;

  return (
    <section className="section events" id="eventos">
      <div className="container">
        <div data-reveal>
          <SectionHead
            index="05"
            label={events.label}
            title={events.title}
            lead={events.lead}
          />
        </div>

        <h3 className="events__subhead">{events.recurringTitle}</h3>

        <div className="events__grid">
          {events.recurring.map((item, index) => (
            <article
              className="event-card"
              key={item.title}
              data-reveal
              data-delay={index > 0 ? String(Math.min(index, 3)) : undefined}
            >
              <span className="event-card__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className="events__month" data-reveal>
          <div className="events__month-head">
            <div>
              <p className="eyebrow">{events.monthLabel}</p>
              <h3 className="events__month-title">{events.monthTitle}</h3>
              <p className="events__month-lead">{events.monthLead}</p>
            </div>

            <a
              className="btn btn--ghost events__month-cta"
              href={whatsappUrl(events.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {events.monthCta}
            </a>
          </div>

          <div className="events__slots" aria-label={events.monthTitle}>
            {Array.from({ length: 8 }, (_, index) => (
              <div className="event-slot" key={index}>
                <span className="event-slot__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="event-slot__label">{events.slotLabel}</span>
                <span className="event-slot__status">{events.monthStatus}</span>
              </div>
            ))}
          </div>
        </div>

        <article className="events__habano" data-reveal>
          <div className="events__habano-copy">
            <p className="events__habano-badge">{events.habano.badge}</p>
            <h3 className="events__habano-title">{events.habano.title}</h3>
            <p className="events__habano-lead">{events.habano.lead}</p>
            <p className="events__habano-meta">{events.habano.meta}</p>

            <div className="events__habano-actions">
              <a
                className="btn btn--brass"
                href={whatsappUrl(events.habano.message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {events.habano.cta}
              </a>
            </div>
          </div>

          <div className="events__habano-mark" aria-hidden="true">
            <span>{events.habano.badge}</span>
            <strong>Habano</strong>
            <span>{events.monthStatus}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
