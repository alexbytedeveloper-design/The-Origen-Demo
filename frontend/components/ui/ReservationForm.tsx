"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { whatsappUrl } from "@/lib/contact";
import { addDaysISO, guestsLabel, todayISO } from "@/lib/format";
import type { Dict } from "@/messages/es";
import type { Locale } from "@/messages";

const TIMES = Array.from({ length: 23 }, (_, index) => {
  const minutes = 12 * 60 + index * 30;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

type FieldName = "date" | "time" | "guests" | "name" | "email" | "phone";
type Errors = Partial<Record<FieldName, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ReservationForm({ dict, locale }: { dict: Dict; locale: Locale }) {
  const copy = dict.booking.form;

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [trap, setTrap] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");

  useEffect(() => {
    setMinDate(todayISO());
    setMaxDate(addDaysISO(90));
  }, []);

  function validate(): Errors {
    const next: Errors = {};
    const today = todayISO();

    if (!date) next.date = copy.errRequired;
    else if (date < today || (maxDate && date > maxDate)) next.date = copy.errDate;

    if (!time) next.time = copy.errRequired;

    const party = Number(guests);
    if (!Number.isInteger(party) || party < 1 || party > 8) {
      next.guests = copy.errGuests;
    }

    if (name.trim().length < 2) next.name = copy.errRequired;
    if (!EMAIL.test(email.trim())) next.email = copy.errEmail;

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) next.phone = copy.errPhone;

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.getElementById(`res-${Object.keys(found)[0]}`);
      first?.focus();
      return;
    }

    // Trampa para bots: el campo está fuera de la vista y no se anuncia.
    if (trap) {
      setDone(true);
      return;
    }

    setSending(true);
    try {
      await api.reserve({
        date,
        time,
        partySize: Number(guests),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });
      setDone(true);
      setDate("");
      setTime("");
      setGuests("2");
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setFormError(copy.errRate);
      } else if (error instanceof ApiError && error.status === 422) {
        setFormError(copy.errRequired);
      } else {
        setFormError(copy.errGeneric);
      }
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="form__success" role="status">
        <h3>{copy.successTitle}</h3>
        <p>{copy.successBody}</p>
        <button type="button" className="btn btn--ghost" onClick={() => setDone(false)}>
          {copy.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="form__alert" role="alert">
          {formError}
        </p>
      )}

      <div className="form__row">
        <label className="field">
          <span className="field__label">{copy.date}</span>
          <input
            className="field__input"
            id="res-date"
            name="date"
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "res-date-error" : undefined}
            onChange={(event) => setDate(event.target.value)}
          />
          {errors.date && (
            <span className="field__error" id="res-date-error">
              {errors.date}
            </span>
          )}
        </label>

        <label className="field">
          <span className="field__label">{copy.time}</span>
          <select
            className="field__input"
            id="res-time"
            name="time"
            value={time}
            aria-invalid={Boolean(errors.time)}
            aria-describedby={errors.time ? "res-time-error" : undefined}
            onChange={(event) => setTime(event.target.value)}
          >
            <option value="">{copy.selectTime}</option>
            {TIMES.map((slot) => (
              <option value={slot} key={slot}>
                {slot}
              </option>
            ))}
          </select>
          {errors.time && (
            <span className="field__error" id="res-time-error">
              {errors.time}
            </span>
          )}
        </label>
      </div>

      <label className="field">
        <span className="field__label">{copy.guests}</span>
        <select
          className="field__input"
          id="res-guests"
          name="guests"
          value={guests}
          aria-invalid={Boolean(errors.guests)}
          aria-describedby={errors.guests ? "res-guests-error" : undefined}
          onChange={(event) => setGuests(event.target.value)}
        >
          {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
            <option value={String(count)} key={count}>
              {count} {guestsLabel(count, locale, copy.guestForms)}
            </option>
          ))}
        </select>
        {errors.guests && (
          <span className="field__error" id="res-guests-error">
            {errors.guests}
          </span>
        )}
      </label>

      <label className="field">
        <span className="field__label">{copy.name}</span>
        <input
          className="field__input"
          id="res-name"
          name="name"
          autoComplete="name"
          maxLength={80}
          value={name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "res-name-error" : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {errors.name && (
          <span className="field__error" id="res-name-error">
            {errors.name}
          </span>
        )}
      </label>

      <div className="form__row">
        <label className="field">
          <span className="field__label">{copy.email}</span>
          <input
            className="field__input"
            id="res-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "res-email-error" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          {errors.email && (
            <span className="field__error" id="res-email-error">
              {errors.email}
            </span>
          )}
        </label>

        <label className="field">
          <span className="field__label">{copy.phone}</span>
          <input
            className="field__input"
            id="res-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={32}
            value={phone}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "res-phone-error" : undefined}
            onChange={(event) => setPhone(event.target.value)}
          />
          {errors.phone && (
            <span className="field__error" id="res-phone-error">
              {errors.phone}
            </span>
          )}
        </label>
      </div>

      <label className="field">
        <span className="field__label">{copy.notes}</span>
        <textarea
          className="field__input"
          name="notes"
          maxLength={400}
          placeholder={copy.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div aria-hidden="true" className="form__trap">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            name="company"
            value={trap}
            onChange={(event) => setTrap(event.target.value)}
          />
        </label>
      </div>

      <p className="form__note">{dict.booking.note}</p>

      <p className="form__note form__note--wa">
        {dict.booking.largeGroup}{" "}
        <a
          href={whatsappUrl(dict.booking.whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {dict.booking.largeGroupCta}
        </a>
      </p>

      <div className="form__actions">
        <button type="submit" className="btn btn--brass btn--block" disabled={sending}>
          {sending ? copy.sending : copy.submit}
        </button>
      </div>
    </form>
  );
}
