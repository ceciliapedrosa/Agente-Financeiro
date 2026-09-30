import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
