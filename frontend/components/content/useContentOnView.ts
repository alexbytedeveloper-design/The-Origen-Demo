"use client";

import { useEffect, useRef } from "react";
import { useContent } from "./ContentProvider";

/**
 * Carga el contenido cuando el bloque está a punto de entrar en pantalla.
 * La carta, las reseñas y la barra lo usan por separado: si alguien llega
 * directo a #resenas, esa sección pide los datos por su cuenta.
 *
 * El temporizador es una red de seguridad: si un navegador no dispara el
 * observador (pestaña oculta, modo de ahorro de energía), el contenido llega
 * igualmente en unos segundos.
 */
export function useContentOnView<T extends HTMLElement>(fallbackMs = 4000) {
  const ref = useRef<T>(null);
  const { load, data } = useContent();

  useEffect(() => {
    const node = ref.current;
    if (!node || data) return;

    const timer = window.setTimeout(load, fallbackMs);

    if (!("IntersectionObserver" in window)) {
      load();
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          window.clearTimeout(timer);
          load();
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [data, load, fallbackMs]);

  return ref;
}
