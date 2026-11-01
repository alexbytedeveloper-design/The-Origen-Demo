import Image from "next/image";
import { SectionHead } from "@/components/ui/SectionHead";
import type { Dict } from "@/messages/es";

export function Fire({ dict }: { dict: Dict }) {
  return (
    <section className="section section--dark fire" id="brasa">
      <div className="container">
        <div className="fire__grid">
          <figure className="fire__figure" data-reveal>
            <Image
              src="/images/dry-aging.jpg"
              alt={dict.fire.photoAlt}
              width={1200}
              height={1500}
              sizes="(max-width: 1080px) 90vw, 38vw"
              className="fire__photo"
            />
            <figcaption>{dict.fire.caption}</figcaption>
          </figure>

          <div data-reveal data-delay="1">
            <SectionHead
              index="02"
              label={dict.fire.label}
              title={dict.fire.title}
              titleClass="fire__title"
            />
            <p className="fire__copy">{dict.fire.p1}</p>
            <p className="fire__copy">{dict.fire.p2}</p>

            <ol className="fire__list">
              {dict.fire.items.map((item, index) => (
                <li className="fire__item" key={item.title}>
                  <span className="fire__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
