"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "./AuthProvider";
import type { Dict } from "@/messages/es";

export function AuthModal({ dict }: { dict: Dict }) {
  const { mode, error, close, switchMode, signIn, signUp } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (mode && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    if (!mode && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      if (isRegister) {
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      setPassword("");
    } catch {
      /* el mensaje ya está en el contexto */
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="auth-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className="modal__panel">
        <button type="button" className="modal__close" onClick={close}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">{dict.auth.close}</span>
        </button>

        <header className="modal__head">
          <Logo className="modal__logo" />
          <h2 className="modal__title" id="auth-title">
            {dict.auth.title}
          </h2>
          <p className="modal__sub">{dict.auth.sub}</p>
        </header>

        <div className="tabs" role="tablist" aria-label={dict.auth.title}>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={!isRegister}
            onClick={() => switchMode("login")}
          >
            {dict.auth.loginTab}
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={isRegister}
            onClick={() => switchMode("register")}
          >
            {dict.auth.registerTab}
          </button>
        </div>

        {error && (
          <p className="form__alert" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate={false}>
          {isRegister && (
            <label className="field">
              <span className="field__label">{dict.auth.name}</span>
              <input
                className="field__input"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">{dict.auth.email}</span>
            <input
              className="field__input"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">{dict.auth.password}</span>
            <input
              className="field__input"
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="form__note">{dict.auth.passwordHint}</span>
          </label>

          <div className="form__actions">
            <button type="submit" className="btn btn--brass btn--block" disabled={sending}>
              {sending
                ? dict.auth.sending
                : isRegister
                  ? dict.auth.submitRegister
                  : dict.auth.submitLogin}
            </button>
          </div>

          <p className="form__note">{dict.auth.demo}</p>
        </form>
      </div>
    </dialog>
  );
}
