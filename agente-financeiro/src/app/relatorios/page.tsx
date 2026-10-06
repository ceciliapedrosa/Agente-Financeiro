import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { monthPeriod, totals, remaining } from "@/lib/finance";
import AppShell from "@/components/AppShell";
import PeriodPicker from "@/components/PeriodPicker";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const period = monthPeriod((await searchParams).month);
  const chartStart = new Date(period.start);
  chartStart.setUTCMonth(chartStart.getUTCMonth() - 5);
  const [historyPayments, historyReceipts] = await Promise.all([
    db.payment.findMany({
      where: { userId, dueDate: { gte: chartStart, lt: period.end } },
    }),
    db.receipt.findMany({
      where: { userId, expectedAt: { gte: chartStart, lt: period.end } },
    }),
  ]);
  const payments = historyPayments.filter((p) => p.dueDate >= period.start),
    receipts = historyReceipts.filter((r) => r.expectedAt >= period.start);
  const summary = totals(payments, receipts);
  const data = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(chartStart);
    start.setUTCMonth(start.getUTCMonth() + i);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return {
      key: start.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(start),
      ...totals(
        historyPayments.filter((p) => p.dueDate >= start && p.dueDate < end),
        historyReceipts.filter(
          (r) => r.expectedAt >= start && r.expectedAt < end,
        ),
      ),
    };
  });
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]));
  return (
    <AppShell active="/relatorios" userName={user.name}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">ANÁLISE</span>
            <h1>Relatórios</h1>
            <p>
              Resumo de {period.label} e comparação dos seis meses encerrados
              nesse período.
            </p>
          </div>
        </div>
        <PeriodPicker action="/relatorios" month={period.key} />
        <div className="stats-grid">
          {[
            ["Receitas previstas", summary.income],
            ["Despesas do mês", summary.expenses],
            ["Saldo previsto", summary.projected],
            ["Pago das contas do mês", summary.paid],
          ].map(([label, value]) => (
            <div className="stat-card" key={String(label)}>
              <small>{label}</small>
              <strong>{brl.format(Number(value))}</strong>
              <span>{period.label}</span>
            </div>
          ))}
        </div>
        <p className="period-note">
          Receitas pela data prevista e despesas pelo vencimento. O total pago
          inclui parcelas já registradas das contas desse mês; não representa
          saídas por data de pagamento.
        </p>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Receitas e despesas previstas — 6 meses</h2>
              <p>Valores exatos disponíveis na tabela abaixo do gráfico.</p>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-income" />
              Receitas
            </span>
            <span>
              <i className="legend-expense" />
              Despesas
            </span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label="Comparação mensal de receitas previstas e despesas por vencimento. Consulte os valores na tabela seguinte."
          >
            {data.map((d) => (
              <div className="bar-column" key={d.key}>
                <div className="bar-stack">
                  <div
                    className="bar income"
                    title={`Receitas: ${brl.format(d.income)}`}
                    style={{ height: `${(d.income / max) * 180}px` }}
                  />
                  <div
                    className="bar expense"
                    title={`Despesas: ${brl.format(d.expenses)}`}
                    style={{ height: `${(d.expenses / max) * 180}px` }}
                  />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <caption className="table-caption">
                Valores do comparativo mensal
              </caption>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Receitas previstas</th>
                  <th>Despesas</th>
                  <th>Saldo previsto</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.key}>
                    <th scope="row">{d.label}</th>
                    <td>{brl.format(d.income)}</td>
                    <td>{brl.format(d.expenses)}</td>
                    <td>{brl.format(d.projected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="report-grid">
          <section className="panel">
            <div className="panel-head">
              <h2>Resumo do mês</h2>
            </div>
            <div className="metric-list">
              <div>
                <span>Quantidade de contas</span>
                <b>{payments.length}</b>
              </div>
              <div>
                <span>Quantidade de receitas</span>
                <b>{receipts.length}</b>
              </div>
              <div>
                <span>Contas com saldo restante</span>
                <b>{payments.filter((p) => remaining(p) > 0).length}</b>
              </div>
              <div>
                <span>Total restante</span>
                <b>{brl.format(summary.pending)}</b>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Maiores despesas do mês</h2>
            </div>
            <div className="metric-list">
              {payments
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id}>
                    <span>{p.name}</span>
                    <b>{brl.format(p.amount)}</b>
                  </div>
                ))}
              {!payments.length && (
                <div className="empty">Sem despesas neste mês.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
