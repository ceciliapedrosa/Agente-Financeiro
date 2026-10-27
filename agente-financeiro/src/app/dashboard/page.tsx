import {cashTotals} from "@/lib/cash-report";
import {dateRange, type DateRangeQuery} from "@/lib/date-range";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, shortDate } from "@/lib/format";
import {
  remaining,
  totals,
  cents,
  todayISO,
} from "@/lib/finance";
import AppShell from "@/components/AppShell";
import PeriodPicker from "@/components/PeriodPicker";
import PaymentForm from "@/components/PaymentForm";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import ReceiptForm from "@/components/ReceiptForm";
import DueBadge from "@/components/DueBadge";
import { urgency, urgencyLabels } from "@/lib/urgency";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<DateRangeQuery & { month?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { payments: true, receipts: true } } },
  });
  if (!user) redirect("/login");
  const period = dateRange(await searchParams);
  const range = { gte: period.start, lt: period.end };
  const today = todayISO();
  const attentionEnd = new Date(today + "T23:59:59Z");
  attentionEnd.setUTCDate(attentionEnd.getUTCDate() + 7);
  const [payments, receipts, future, receivedTotal, recordedPayments, urgent] =
    await Promise.all([
      db.payment.findMany({
        where: { userId, cancelledAt: null, dueDate: range },
        orderBy: { dueDate: "asc" },
      }),
      db.receipt.findMany({
        where: { userId, cancelledAt: null, expectedAt: range },
      }),
      db.payment.findMany({
        where: {
          userId,
          cancelledAt: null,
          dueDate: { gte: period.end },
          status: { not: "PAID" },
        },
      }),
      db.receipt.aggregate({
        where: {
          userId,
          cancelledAt: null,
          receivedAt: range,
        },
        _sum: { amount: true },
      }),
      db.payment.findMany({where:{userId,cancelledAt:null},include:{events:true}}),
      db.payment.findMany({
        where: {
          userId,
          cancelledAt: null,
          status: { not: "PAID" },
          dueDate: { ...range, lte: attentionEnd },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);
  const [expectedReceipts, unreviewedCards] = await Promise.all([
    db.receipt.findMany({
      where: {
        userId,
        cancelledAt: null,
        receivedAt: null,
        expectedAt: { ...range, lte: attentionEnd },
      },
      orderBy: { expectedAt: "asc" },
    }),
    db.card.count({
      where: { userId, invoiceReviewedAt: null, currentInvoice: { gt: 0 } },
    }),
  ]);
  const realized =
    (cents(receivedTotal._sum.amount ?? 0) -
      cents(cashTotals(recordedPayments, [], period.start, period.end).expenses)) /
    100;
  const summary = totals(payments, receipts);
  const pending = payments.filter((p) => remaining(p) > 0);
  return (
    <AppShell active="/dashboard" userName={user.name} rangeQuery={period.search}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">VISÃO GERAL</span>
            <h1>Olá, {user.name.split(" ")[0]} 👋</h1>
            <p>Organização financeira de {period.label}.</p>
          </div>
          <div className="quick-actions">
            <ReceiptForm buttonLabel="Adicionar receita" />
            <PaymentForm buttonLabel="Adicionar despesa" /><Link className="btn secondary" href="/importar">Importar planilha</Link>
          </div>
        </div>
        {user._count.payments === 0 && user._count.receipts === 0 && (
          <section className="panel onboarding">
            <h2>Comece com duas informações</h2>
            <ol>
              <li>
                <strong>Cadastre uma receita</strong>
                <span>Informe quanto espera receber e quando.</span>
              </li>
              <li>
                <strong>Adicione uma despesa</strong>
                <span>
                  Registre valor e vencimento para acompanhar o que falta pagar.
                </span>
              </li>
            </ol>
            <p>
              O painel calcula sua previsão e organiza os próximos vencimentos
              conforme você preenche.
            </p>
          </section>
        )}
        <section className="panel realized-balance">
          <div>
            <h2>Saldo realizado no período</h2>
            <p>
              Entradas recebidas menos pagamentos registrados, pela data efetiva no período.
            </p>
          </div>
          <strong>{brl.format(realized)}</strong>
        </section>
        <PeriodPicker action="/dashboard" period={period} />
        {summary.income === 0 && (
          <section className="panel guidance-card">
            <div>
              <h2>Adicione suas receitas de {period.label}</h2>
              <p>
                Sem receitas cadastradas, a previsão considera apenas as contas.
                Cadastre suas entradas para planejar o período.
              </p>
            </div>
            <ReceiptForm initialDate={period.from} />
          </section>
        )}
        <div className="stats-grid">
          {[
            [
              "Saldo previsto do período",
              summary.projected,
              "Receitas previstas menos o valor total das contas do período.",
            ],
            [
              "A pagar confirmado no período",
              summary.pending,
              `${pending.length} contas com saldo restante. ${unreviewedCards > 0 ? `${unreviewedCards} cartão(ões) ainda precisam de revisão; o total pode aumentar.` : "Inclui pagamentos parciais."}`,
            ],
            [
              "Pago das contas do período",
              summary.paid,
              "Inclui pagamentos parciais das contas com vencimento neste período.",
            ],
            [
              "Receitas previstas",
              summary.income,
              `${receipts.length} entradas com previsão neste período.`,
            ],
          ].map(([label, value, help]) => (
            <div className="stat-card" key={String(label)}>
              <small>{label}</small>
              <strong>{brl.format(Number(value))}</strong>
              <span>{help}</span>
            </div>
          ))}
        </div>
        <details className="panel dashboard-help"><summary>Entenda os saldos e compromissos futuros</summary><p className="period-note">
          O saldo realizado usa as datas efetivas do período selecionado, sem saldo bancário inicial. Os totais usam o vencimento das contas e a data prevista das receitas.
          O saldo previsto não é seu saldo bancário. Compromissos após este período:{" "}
          <b>{brl.format(future.reduce((s, p) => s + remaining(p), 0))}</b>.
        </p></details>
        {unreviewedCards > 0 && (
          <section className="panel guidance-card">
            <div>
              <h2>Confirme as faturas dos seus cartões</h2>
              <p>
                {unreviewedCards} cartão(ões) têm valores antigos sem
                competência e situação definidas. Esses valores ainda não entram
                como faturas confirmadas no planejamento.
              </p>
              <Link className="text-link" href={`/cartoes?${period.search}`}>
                Revisar faturas →
              </Link>
            </div>
          </section>
        )}
        {expectedReceipts.length > 0 && <section className="panel attention-panel">
          <div className="panel-head">
            <div>
              <h2>Recebimentos para acompanhar</h2>
              <p>
                Atrasos e entradas para hoje e os próximos 7 dias, dentro do período selecionado.
              </p>
            </div>
          </div>
          <div className="attention-grid">
            {["OVERDUE", "UPCOMING"].map((kind) => {
              const group = expectedReceipts.filter((r) =>
                kind === "OVERDUE"
                  ? r.expectedAt.toISOString().slice(0, 10) < today
                  : r.expectedAt.toISOString().slice(0, 10) >= today,
              );
              if (!group.length) return null;
              return (
                <Link
                  key={kind}
                  className={`attention-card attention-${kind.toLowerCase()}`}
                  href={`/receitas?${period.search}&status=${kind}`}
                >
                  <span>
                    {kind === "OVERDUE"
                      ? "Receitas atrasadas"
                      : "Receitas previstas · hoje e próximos 7 dias"}
                  </span>
                  <strong>
                    {brl.format(
                      group.reduce((s, r) => s + cents(r.amount), 0) / 100,
                    )}
                  </strong>
                  <small>{group.length} entrada(s) · ver detalhes →</small>
                </Link>
              );
            })}
          </div>
        </section>}
        {urgent.length > 0 && <section className="panel attention-panel">
          <div className="panel-head">
            <div>
              <h2>Precisa da sua atenção</h2>
              <p>
                Vencimentos em relação a hoje, incluindo atrasos de meses
                anteriores. Independente do período selecionado.
              </p>
            </div>
          </div>
          <div className="attention-grid">
            {(["OVERDUE", "TODAY", "UPCOMING"] as const).map((kind) => {
              const group = urgent.filter((p) => urgency(p, today) === kind);
              if (!group.length) return null;
              return (
                <Link
                  key={kind}
                  href={`/pagamentos?status=${kind}&${period.search}`}
                  className={`attention-card attention-${kind.toLowerCase()}`}
                >
                  <span>{urgencyLabels[kind]}</span>
                  <strong>
                    {brl.format(
                      group.reduce((sum, p) => sum + remaining(p), 0),
                    )}
                  </strong>
                  <small>{group.length} contas · ver detalhes →</small>
                </Link>
              );
            })}
          </div>
        </section>}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Contas a pagar de {period.label}</h2>
              <p>
                Ordenadas por vencimento. Valores mostram o que falta pagar.
              </p>
            </div>
            <Link
              href={`/pagamentos?${period.search}`}
              className="text-link"
            >
              Ver todas
            </Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              title="Nenhuma conta pendente neste período"
              description="Cadastre sua próxima despesa para acompanhar os vencimentos e planejar quanto vai sobrar."
            >
              <PaymentForm buttonLabel="Adicionar despesa" />
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="mobile-records">
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Vencimento</th>
                    <th>Restante</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.slice(0, 6).map((p) => (
                    <tr key={p.id}>
                      <td data-label="Conta">
                        <Link
                          className="text-link"
                          href={`/pagamentos?${period.search}#conta-${p.id}`}
                        >
                          {p.name}
                        </Link>
                        <small>{p.category}</small>
                      </td>
                      <td data-label="Vencimento">
                        {shortDate.format(p.dueDate)}
                        <DueBadge payment={p} />
                      </td>
                      <td data-label="Restante">{brl.format(remaining(p))}</td>
                      <td data-label="Status">
                        <StatusBadge status={p.status} />
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
