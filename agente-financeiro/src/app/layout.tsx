import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#ffffff" };

export const metadata: Metadata = {
  applicationName: "DIZI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/dizi.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/dizi-32.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/icons/dizi-180.png?v=2", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "DIZI", statusBarStyle: "default" },
  title: "DIZI | Seu agente financeiro",
  description: "Gestão pessoal de pagamentos, receitas e prioridades com a DIZI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
