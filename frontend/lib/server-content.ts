import type { ContentPayload } from "@/lib/api";
import { getContent } from "@/lib/content-data";

/**
 * Carga inicial de la carta en el servidor.
 *
 * La carta se pinta así en el HTML de la primera respuesta: no depende de que
 * una pestaña esté visible ni de que el observador de scroll se dispare. Los
 * datos se leen directamente (sin petición HTTP) para no depender de que la
 * API route esté disponible durante el render.
 */
export async function getInitialContent(
  locale: string,
): Promise<ContentPayload | null> {
  try {
    const payload = getContent(locale);
    if (
      !payload ||
      !payload.menu ||
      !Array.isArray(payload.menu.sections) ||
      !Array.isArray(payload.reviews) ||
      !Array.isArray(payload.signature)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
