import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import CardForm from "@/components/CardForm";
import { brl } from "@/lib/format";
import { CreditCard, Gauge, Receipt, WalletCards } from "lucide-react";

export default async function Page() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const cards = await db.card.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);
  const invoice = cards.reduce((s, c) => s + c.currentInvoice, 0);
  const available = Math.max(0, totalLimit - invoice);
  const usage = totalLimit ? (invoice / totalLimit) * 100 : 0;

  return (
    <AppShell active="/cartoes" userName={user.name}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">CRÉDITO</span>
            <h1>Cartões</h1>
            <p>Controle limites, faturas, fechamento e vencimentos.</p>
          </div>
          <CardForm />
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <WalletCards />
            </div>
            <small>Limite total</small>
            <strong>{brl.format(totalLimit)}</strong>
            <span>{cards.length} cartões</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Receipt />
            </div>
            <small>Fatura atual</small>
            <strong>{brl.format(invoice)}</strong>
            <span>soma das faturas</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CreditCard />
            </div>
            <small>Disponível</small>
            <strong>{brl.format(available)}</strong>
            <span>limite restante</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Gauge />
            </div>
            <small>Uso do limite</small>
            <strong>{usage.toFixed(0)}%</strong>
            <span>do limite total</span>
          </div>
        </div>
        <div className="card-grid">
          {cards.map((c) => (
            <article className="credit-card-item" key={c.id}>
              <div className="credit-card-top">
                <div>
                  <small>{c.institution}</small>
                  <h3>{c.name}</h3>
                </div>
                <CreditCard />
              </div>
              <div className="credit-card-value">
                <small>Fatura atual</small>
                <strong>{brl.format(c.currentInvoice)}</strong>
              </div>
              <div className="limit-track">
                <span
                  style={{
                    width:
                      String(
                        Math.min(
                          100,
                          c.creditLimit
                            ? (c.currentInvoice / c.creditLimit) * 100
                            : 0,
                        ),
                      ) + "%",
                  }}
                />
              </div>
              <div className="credit-card-meta">
                <span>Limite {brl.format(c.creditLimit)}</span>
                <span>Fecha dia {c.closingDay}</span>
                <span>Vence dia {c.dueDay}</span>
              </div>
            </article>
          ))}
          {cards.length === 0 && (
            <section className="panel span-full">
              <EmptyState
                title="Seu primeiro cartão"
                description="Cadastre limite, fatura e vencimento para visualizar o crédito disponível e se organizar."
              >
                <CardForm />
              </EmptyState>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
