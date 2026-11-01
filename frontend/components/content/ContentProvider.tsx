"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type ContentPayload } from "@/lib/api";

type Status = "idle" | "loading" | "ready" | "error";

type ContentValue = {
  status: Status;
  data: ContentPayload | null;
  load: () => void;
  retry: () => void;
};

const ContentContext = createContext<ContentValue | null>(null);

/**
 * La carta, las reseñas y la barra llegan en una sola llamada y solo cuando
 * la carta está a punto de entrar en pantalla. El hero y la casa van en HTML.
 */
export function ContentProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ContentPayload | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current || data) return;
    inFlight.current = true;
    setStatus("loading");
    api
      .content(locale)
      .then((payload) => {
        setData(payload);
        setStatus("ready");
      })
      .catch(() => setStatus("error"))
      .finally(() => {
        inFlight.current = false;
      });
  }, [data, locale]);

  const retry = useCallback(() => {
    setStatus("idle");
    // el estado se aplica en el siguiente tick; load comprueba data, no status
    window.setTimeout(load, 0);
  }, [load]);

  const value = useMemo(
    () => ({ status, data, load, retry }),
    [status, data, load, retry],
  );

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent necesita ContentProvider");
  return ctx;
}
