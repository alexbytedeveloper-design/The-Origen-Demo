import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/es",
    name: "The Origen",
    short_name: "Origen",
    description:
      "Piedra caliente, producto de mercado y coctelería clásica en Miramar, La Habana.",
    lang: "es",
    dir: "ltr",
    start_url: "/es",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#14100e",
    theme_color: "#14100e",
    categories: ["food", "drink", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Menú", short_name: "Menú", url: "/es/menu" },
      { name: "Reservar", short_name: "Reservar", url: "/es#reservas" },
    ],
  };
}
