import {
  localeNames,
  localeShort,
  locales,
  type Locale,
} from "@/messages";

export function LangSwitch({
  locale,
  label,
  path = "",
}: {
  locale: Locale;
  label: string;
  path?: string;
}) {
  return (
    <nav className="lang" aria-label={label}>
      <ul className="lang__list">
        {locales.map((code) => (
          <li key={code}>
            <a
              className="lang__link"
              href={`/${code}${path}`}
              hrefLang={code}
              lang={code}
              aria-current={code === locale ? "true" : undefined}
              title={localeNames[code]}
            >
              {localeShort[code]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
