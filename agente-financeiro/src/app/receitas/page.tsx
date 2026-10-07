import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ReceiptForm from "@/components/ReceiptForm";
import ReceiptAction from "@/components/ReceiptAction";
import EmptyState from "@/components/EmptyState";
import FinancialFilters from "@/components/FinancialFilters";
import { brl } from "@/lib/format";
import { monthPeriod, cents } from "@/lib/finance";
import { filterFinancialRows } from "@/lib/financial-search";
const dates = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    q?: string;
    category?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const query = await searchParams,
    period = monthPeriod(query.month),
    month = !query.month || query.month === "all" ? "all" : period.key;
  const q = (query.q ?? "").slice(0, 200),
    category = query.category ?? "",
    sort = ["date_asc", "date_desc", "amount_asc", "amount_desc"].includes(
      query.sort ?? "",
    )
      ? query.sort!
      : "date_asc";
  const status = ["PENDING", "RECEIVED"].includes(query.status ?? "")
    ? query.status!
    : "ALL";
  const [all, categoryRows] = await Promise.all([
    db.receipt.findMany({
      where: {
        userId,
        ...(month === "all"
          ? {}
          : { expectedAt: { gte: period.start, lt: period.end } }),
      },
    }),
    db.receipt.findMany({
      where: { userId },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);
  const rs = filterFinancialRows(
    all.filter((r) =>
      status === "PENDING"
        ? !r.receivedAt
        : status === "RECEIVED"
          ? !!r.receivedAt
          : true,
    ),
    q,
    category,
    sort,
    (r) => r.expectedAt,
  );
  const total = rs.reduce((s, r) => s + cents(r.amount), 0) / 100,
    received =
      rs.filter((r) => r.receivedAt).reduce((s, r) => s + cents(r.amount), 0) /
      100;
  return (
    <AppShell active="/receitas" userName={user.name}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">ENTRADAS</span>
            <h1>Receitas</h1>
            <p>
              Compare a previsão com a data em que o dinheiro realmente entrou.
            </p>
          </div>
          <ReceiptForm />
        </div>
        <FinancialFilters
          key={JSON.stringify(query)}
          action="/receitas"
          month={month}
          status={status}
          q={q}
          category={category}
          sort={sort}
          categories={categoryRows
            .map((r) => r.category)
            .sort((a, b) => a.localeCompare(b, "pt-BR"))}
          receipts
        />
        <div className="stats-grid">
          {[
            ["Total previsto", total],
            ["Recebido", received],
            [
              "A receber",
              (Math.round(total * 100) - Math.round(received * 100)) / 100,
            ],
          ].map(([label, value]) => (
            <div className="stat-card" key={label}>
              <small>{label}</small>
              <strong>{brl.format(Number(value))}</strong>
              <span>Somente os resultados filtrados</span>
            </div>
          ))}
          <div className="stat-card">
            <small>Recorrentes</small>
            <strong>{rs.filter((r) => r.recurring).length}</strong>
            <span>Lançamentos recorrentes no filtro</span>
          </div>
        </div>
        <p className="filtered-summary" role="status">
          {rs.length} resultado(s) · Total filtrado:{" "}
          <strong>{brl.format(total)}</strong>. O período usa a data prevista;
          recebimentos mostram a data efetiva.
        </p>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Entradas</h2>
              <p>
                A data prevista permanece como referência mesmo após receber.
              </p>
            </div>
          </div>
          {!rs.length ? (
            <EmptyState
              title="Nenhuma receita encontrada"
              description="Cadastre sua primeira entrada para planejar o mês ou ajuste os filtros para encontrar receitas anteriores."
            >
              <ReceiptForm buttonLabel="Adicionar receita" />
              <Link className="btn secondary" href="/receitas">
                Limpar filtros
              </Link>
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Receita</th>
                    <th>Data prevista</th>
                    <th>Recebido em</th>
                    <th>Valor</th>
                    <th>Recorrência</th>
                    <th>Status e ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rs.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.name}</b>
                        <small>{r.category}</small>
                      </td>
                      <td>{dates.format(r.expectedAt)}</td>
                      <td>
                        {r.receivedAt
                          ? dates.format(r.receivedAt)
                          : "Ainda não recebida"}
                      </td>
                      <td>
                        <b>{brl.format(r.amount)}</b>
                      </td>
                      <td>{r.recurring ? "Recorrente" : "Única"}</td>
                      <td>
                        <ReceiptAction
                          id={r.id}
                          name={r.name}
                          receivedAt={r.receivedAt?.toISOString() ?? null}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
