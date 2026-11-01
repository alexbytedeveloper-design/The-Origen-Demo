export function formatPrice(value: number, _locale: string): string {
  // La carta real usa siempre dólares con dos decimales: $2.50, no $2,50.
  return `$${value.toFixed(2)}`;
}

export function formatLongDate(iso: string, locale: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

type GuestForms = { one: string; few?: string; many?: string; other: string };

export function guestsLabel(count: number, locale: string, forms: GuestForms): string {
  const rule = new Intl.PluralRules(locale).select(count) as
    | "one"
    | "few"
    | "many"
    | "other";
  return forms[rule] ?? forms.other;
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
