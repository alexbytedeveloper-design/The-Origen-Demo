import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Origen",
    short_name: "Origen",
    description:
      "Piedra caliente, producto de mercado y coctelería clásica en Miramar, La Habana.",
    start_url: "/es",
    display: "standalone",
    background_color: "#14100e",
    theme_color: "#14100e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
