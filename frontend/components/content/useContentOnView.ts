"use client";

import { useEffect, useRef } from "react";
import { useContent } from "./ContentProvider";

/**
 * Carga el contenido cuando el bloque está a punto de entrar en pantalla.
 * La carta, las reseñas y la barra lo usan por separado: si alguien llega
 * directo a #resenas, esa sección pide los datos por su cuenta.
 */
export function useContentOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { load, data } = useContent();

  useEffect(() => {
    const node = ref.current;
    if (!node || data) return;

    if (!("IntersectionObserver" in window)) {
      load();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load();
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [data, load]);

  return ref;
}
