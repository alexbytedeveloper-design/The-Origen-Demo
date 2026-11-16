import type { ContentPayload } from "@/lib/api";

const API_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

/**
 * Carga inicial de la carta en el servidor.
 *
 * La carta se pinta así en el HTML de la primera respuesta: no depende de que
 * una pestaña esté visible ni de que el observador de scroll se dispare. Si la
 * API no responde, devuelve ``null`` y el cliente reintenta con su carga
 * diferida habitual.
 */
export async function getInitialContent(
  locale: string,
): Promise<ContentPayload | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(
      `${API_URL}/api/v1/content/${encodeURIComponent(locale)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<ContentPayload> | null;
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.menu ||
      !Array.isArray(payload.menu.sections) ||
      !Array.isArray(payload.reviews) ||
      !Array.isArray(payload.signature)
    ) {
      return null;
    }

    return payload as ContentPayload;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
