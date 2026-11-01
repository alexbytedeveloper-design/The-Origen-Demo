import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Hero({ dict, locale }: { dict: Dict; locale: Locale }) {
  return (
    <section className="hero" id="inicio">
      <div className="hero__content">
        <Logo className="hero__logo" decorative />
        <h1 className="hero__title">{dict.hero.headline}</h1>
        <p className="hero__lead">{dict.hero.lead}</p>

        <div className="hero__actions">
          <a className="btn btn--brass" href="#reservas">
            {dict.hero.cta}
          </a>
          <a className="link" href={`/${locale}/menu`}>
            {dict.hero.secondary}
          </a>
        </div>

        <p className="hero__meta">{dict.hero.place}</p>
      </div>

      <div className="hero__media">
        <Image
          src="/images/hero-tomahawk.jpg"
          alt={dict.hero.photoAlt}
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 48vw"
          className="hero__photo"
        />
      </div>
    </section>
  );
}
