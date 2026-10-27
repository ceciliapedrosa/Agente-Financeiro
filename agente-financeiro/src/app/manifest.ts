import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DIZI — Agente Financeiro",
    short_name: "DIZI",
    description: "Organize receitas, despesas e faturas com a DIZI.",
    lang: "pt-BR",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/dizi-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/dizi-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/dizi-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
