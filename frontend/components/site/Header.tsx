"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LangSwitch } from "@/components/site/LangSwitch";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

export function Header({ locale, dict }: { locale: Locale; dict: Dict }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { user, open, signOut } = useAuth();

  const base = `/${locale}`;
  const isHome = pathname === base;
  const isMenu = pathname === `${base}/menu`;
  const solid = scrolled || panelOpen || !isHome;
  const langPath = pathname.startsWith(`${base}/`)
    ? pathname.slice(base.length)
    : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const headerClass = [
    "site-header",
    solid ? "is-solid" : "",
    isMenu ? "is-menu" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const links = [
    { href: `${base}#casa`, label: dict.nav.house },
    { href: `${base}/menu`, label: dict.nav.menu },
    { href: `${base}#brasa`, label: dict.nav.fire },
    { href: `${base}#resenas`, label: dict.nav.reviews },
    { href: `${base}#eventos`, label: dict.nav.events },
  ];

  return (
    <>
      <header className={headerClass}>
        <div className="container container--wide header__inner">
          <a className="brand" href={base} aria-label="The Origen">
            <Logo className="brand__logo" decorative />
          </a>

          <nav className="nav" aria-label={dict.nav.label}>
            {links.map((link) => (
              <a key={link.href} className="nav__link" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <LangSwitch locale={locale} label={dict.nav.lang} path={langPath} />

            {user ? (
              <span className="userchip">
                {dict.auth.greeting} {user.name.split(" ")[0]}
                <button type="button" onClick={() => void signOut()}>
                  {dict.auth.logout}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--ghost header__btn"
                onClick={() => open("login")}
              >
                {dict.nav.account}
              </button>
            )}

            <a className="btn btn--brass header__btn" href={`${base}#reservas`}>
              {dict.nav.book}
            </a>

            <button
              type="button"
              className="menu-toggle"
              aria-expanded={panelOpen}
              aria-controls="mobile-panel"
              aria-label={panelOpen ? dict.nav.menuClose : dict.nav.menuOpen}
              onClick={() => setPanelOpen((value) => !value)}
            >
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        className="mobile-panel"
        id="mobile-panel"
        data-open={panelOpen}
        aria-hidden={!panelOpen}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            tabIndex={panelOpen ? 0 : -1}
            onClick={() => setPanelOpen(false)}
          >
            {link.label}
          </a>
        ))}

        <a
          className="btn btn--brass"
          href={`${base}#reservas`}
          tabIndex={panelOpen ? 0 : -1}
          onClick={() => setPanelOpen(false)}
        >
          {dict.nav.book}
        </a>

        <div className="mobile-panel__foot">
          {user ? (
            <button
              type="button"
              className="btn btn--ghost"
              tabIndex={panelOpen ? 0 : -1}
              onClick={() => {
                setPanelOpen(false);
                void signOut();
              }}
            >
              {dict.auth.logout}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              tabIndex={panelOpen ? 0 : -1}
              onClick={() => {
                setPanelOpen(false);
                open("login");
              }}
            >
              {dict.nav.account}
            </button>
          )}
          <LangSwitch
            locale={locale}
            label={dict.nav.lang}
            path={langPath}
          />
        </div>
      </div>
    </>
  );
}
