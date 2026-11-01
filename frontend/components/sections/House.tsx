import Image from "next/image";
import { SectionHead } from "@/components/ui/SectionHead";
import { INSTAGRAM_URL } from "@/lib/contact";
import type { Dict } from "@/messages/es";

export function House({ dict }: { dict: Dict }) {
  const facts: { key: string; value: string; href?: string }[] = [
    { key: dict.house.addressKey, value: dict.house.addressValue },
    { key: dict.house.hoursKey, value: dict.house.hoursValue },
    {
      key: dict.house.instagramKey,
      value: dict.house.instagramValue,
      href: INSTAGRAM_URL,
    },
  ];

  return (
    <section className="section" id="casa">
      <div className="container">
        <div className="house__grid">
          <div className="house__copy" data-reveal>
            <SectionHead
              index="01"
              label={dict.house.label}
              title={dict.house.title}
              titleClass="house__title"
            />
            <p>{dict.house.p1}</p>
            <p>{dict.house.p2}</p>

            <dl className="facts">
              {facts.map((fact) => (
                <div className="facts__row" key={fact.key}>
                  <dt className="facts__key">{fact.key}</dt>
                  <dd style={{ margin: 0 }}>
                    {fact.href ? (
                      <a
                        href={fact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className="house__figure" data-reveal data-delay="1">
            <div className="house__frame">
              <Image
                src="/images/table-evening.jpg"
                alt={dict.house.photoAlt}
                width={1200}
                height={1500}
                sizes="(max-width: 1080px) 90vw, 44vw"
                className="house__photo"
              />
            </div>
            <figcaption className="house__caption">{dict.house.caption}</figcaption>
            <span className="house__seal" aria-hidden="true">
              <span>
                <strong>{dict.house.sealYear}</strong>
                {dict.house.sealTop}
              </span>
            </span>
          </figure>
        </div>
      </div>
    </section>
  );
}
