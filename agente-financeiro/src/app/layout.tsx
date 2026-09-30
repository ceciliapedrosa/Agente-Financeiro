import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agente Financeiro",
  description: "Gestão pessoal de pagamentos, receitas e prioridades.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
