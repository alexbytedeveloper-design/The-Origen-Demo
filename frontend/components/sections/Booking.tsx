import { ReservationForm } from "@/components/ui/ReservationForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { PHONE_TEL, whatsappUrl } from "@/lib/contact";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Booking({ dict, locale }: { dict: Dict; locale: Locale }) {
  const info: { key: string; value: string; href?: string }[] = [
    { key: dict.booking.hoursKey, value: dict.booking.hoursValue },
    {
      key: dict.booking.phoneKey,
      value: dict.booking.phoneValue,
      href: `tel:${PHONE_TEL}`,
    },
    { key: dict.booking.addressKey, value: dict.booking.addressValue },
  ];

  return (
    <section className="section booking" id="reservas">
      <div className="container">
        <div className="booking__grid">
          <div data-reveal>
            <SectionHead
              index="06"
              label={dict.booking.label}
              title={dict.booking.title}
              titleClass="booking__title"
            />
            <p className="booking__copy">{dict.booking.copy}</p>

            <dl className="booking__info">
              {info.map((row) => (
                <div className="booking__info-row" key={row.key}>
                  <dt>{row.key}</dt>
                  <dd>
                    {row.href ? (
                      <a href={row.href}>{row.value}</a>
                    ) : (
                      row.value.split("\n").map((line, index) => (
                        <span key={line}>
                          {index > 0 && <br />}
                          {line}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <a
              className="btn btn--ghost booking__wa"
              href={whatsappUrl(dict.booking.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.booking.whatsappCta}
            </a>
          </div>

          <div className="booking__card" data-reveal data-delay="1">
            <ReservationForm dict={dict} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
