import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/api";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El proxy de la API no es contenido: ni se indexa ni se rastrea.
        disallow: ["/backend/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
