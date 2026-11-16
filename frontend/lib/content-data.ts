import type { ContentPayload } from "@/lib/api";

import en from "./content/en.json";
import es from "./content/es.json";
import fr from "./content/fr.json";
import ru from "./content/ru.json";

/**
 * Datos de la carta embebidos en el frontend.
 *
 * Antes vivían en el backend FastAPI; al migrar a un solo despliegue quedan
 * aquí y los sirve la API route `/api/content/[locale]`, además de la carga
 * inicial en el servidor.
 */
const CONTENT: Record<string, Omit<ContentPayload, "locale" | "updatedAt">> = {
  en: en as unknown as Omit<ContentPayload, "locale" | "updatedAt">,
  es: es as unknown as Omit<ContentPayload, "locale" | "updatedAt">,
  fr: fr as unknown as Omit<ContentPayload, "locale" | "updatedAt">,
  ru: ru as unknown as Omit<ContentPayload, "locale" | "updatedAt">,
};

export function getContent(locale: string): ContentPayload {
  const base = CONTENT[locale] ?? CONTENT.es;
  return {
    locale,
    menu: base.menu,
    reviews: base.reviews,
    signature: base.signature,
    updatedAt: new Date().toISOString(),
  };
}
