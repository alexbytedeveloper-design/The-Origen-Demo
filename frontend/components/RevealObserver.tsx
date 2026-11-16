"use client";

import { useEffect } from "react";

/**
 * Un solo observador para todo el documento. Los bloques llevan
 * data-reveal en el marcado y aquí se les añade is-visible una vez.
 *
 * El contenido es visible por defecto: solo se oculta lo que queda por debajo
 * del pliegue cuando hay JavaScript, la pestaña está visible y el navegador
 * soporta IntersectionObserver. Si algo de eso falla, no se esconde nada.
 *
 * La carta, las reseñas y la barra también pueden pintarse después de cargar
 * el JSON, así que hay que vigilar los nodos que aparecen más tarde.
 */
export function RevealObserver() {
  useEffect(() => {
    const reveal = (node: HTMLElement) => {
      node.classList.add("is-visible");
      node.classList.remove("is-pending");
    };

    const revealAll = () => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((node) => reveal(node));
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      reduced ||
      !("IntersectionObserver" in window) ||
      document.visibilityState === "hidden" ||
      !document.hasFocus()
    ) {
      revealAll();
      return;
    }

    const isBelowFold = (node: HTMLElement) =>
      node.getBoundingClientRect().top > window.innerHeight * 0.92;

    const markPending = () => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)")
        .forEach((node) => {
          if (isBelowFold(node)) {
            node.classList.add("is-pending");
          } else {
            reveal(node);
          }
        });
    };

    markPending();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    const observePending = () => {
      markPending();
      document
        .querySelectorAll<HTMLElement>("[data-reveal].is-pending:not(.is-visible)")
        .forEach((node) => observer.observe(node));
    };

    observePending();

    const mutations = new MutationObserver(observePending);
    mutations.observe(document.body, { childList: true, subtree: true });

    // Si la pestaña pasa a segundo plano, el observador puede dejar de emitir.
    // Al volver, el contenido debe estar ahí sin depender de un callback.
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") revealAll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Red de seguridad para navegadores donde IntersectionObserver existe pero
    // no entrega entradas. Solo revela lo que ya está en pantalla.
    let ioFired = false;
    const safety = new IntersectionObserver(() => {
      ioFired = true;
    });
    safety.observe(document.body);
    let cleanupFallback: (() => void) | null = null;
    const safetyTimer = window.setTimeout(() => {
      safety.disconnect();
      if (ioFired) return;

      const revealInView = () => {
        document
          .querySelectorAll<HTMLElement>("[data-reveal].is-pending")
          .forEach((node) => {
            const rect = node.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) reveal(node);
          });
      };

      revealInView();
      window.addEventListener("scroll", revealInView, { passive: true });
      window.addEventListener("resize", revealInView);
      cleanupFallback = () => {
        window.removeEventListener("scroll", revealInView);
        window.removeEventListener("resize", revealInView);
      };
    }, 1200);

    return () => {
      window.clearTimeout(safetyTimer);
      safety.disconnect();
      cleanupFallback?.();
      mutations.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
