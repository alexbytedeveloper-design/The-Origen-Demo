import { Logo } from "@/components/brand/Logo";
import { LangSwitch } from "@/components/site/LangSwitch";
import { INSTAGRAM_URL, PHONE_TEL, whatsappUrl } from "@/lib/contact";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Footer({ locale, dict }: { locale: Locale; dict: Dict }) {
  const base = `/${locale}`;

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Logo className="footer__logo" />
            <p className="footer__claim">{dict.footer.claim}</p>
          </div>

          <div className="footer__col">
            <h3>{dict.footer.colHouse}</h3>
            <a href={`${base}#casa`}>{dict.nav.house}</a>
            <a href={`${base}/menu`}>{dict.nav.menu}</a>
            <a href={`${base}#brasa`}>{dict.nav.fire}</a>
            <a href={`${base}#resenas`}>{dict.nav.reviews}</a>
            <a href={`${base}#eventos`}>{dict.nav.events}</a>
          </div>

          <div className="footer__col">
            <h3>{dict.footer.colContact}</h3>
            <p>{dict.house.addressValue}</p>
            <a href={`tel:${PHONE_TEL}`}>{dict.booking.phoneValue}</a>
            <a
              href={whatsappUrl(dict.whatsapp.message)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {dict.whatsapp.label}
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {dict.footer.instagram} · {dict.house.instagramValue}
            </a>
            <a href={`${base}#reservas`}>{dict.nav.book}</a>
          </div>

          <div className="footer__col">
            <h3>{dict.footer.colHours}</h3>
            <p>
              {dict.house.hoursValue.split("·")[0].trim()}
              <br />
              {dict.house.hoursValue.split("·")[1]?.trim()}
            </p>
            <LangSwitch locale={locale} label={dict.nav.lang} />
          </div>
        </div>

        <div className="footer__bottom">
          <span>{dict.footer.rights}</span>
          <span>
            <a href={`${base}/legal/privacidad`}>{dict.footer.privacy}</a>
            {" · "}
            <a href={`${base}/legal/creditos`}>{dict.footer.credits}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
