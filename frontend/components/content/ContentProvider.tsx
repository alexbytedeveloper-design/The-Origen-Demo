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
 * La carta, las reseñas y la barra llegan en una sola llamada. En la primera
 * visita el HTML ya trae los datos del servidor; esta carga queda como
 * reintento si esa primera petición falló.
 */
export function ContentProvider({
  locale,
  initialData = null,
  children,
}: {
  locale: string;
  initialData?: ContentPayload | null;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<Status>(initialData ? "ready" : "idle");
  const [data, setData] = useState<ContentPayload | null>(initialData);
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
