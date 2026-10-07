import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, shortDate } from "@/lib/format";
import {
  monthPeriod,
  remaining,
  totals,
  paidValue,
  cents,
  todayISO,
} from "@/lib/finance";
import AppShell from "@/components/AppShell";
import PeriodPicker from "@/components/PeriodPicker";
import PaymentForm from "@/components/PaymentForm";
import StatusBadge from "@/components/StatusBadge";
import ReceiptForm from "@/components/ReceiptForm";
import DueBadge from "@/components/DueBadge";
import { urgency, urgencyLabels } from "@/lib/urgency";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const period = monthPeriod((await searchParams).month);
  const range = { gte: period.start, lt: period.end };
  const today = todayISO();
  const attentionEnd = new Date(today + "T23:59:59Z");
  attentionEnd.setUTCDate(attentionEnd.getUTCDate() + 7);
  const [payments, receipts, future, receivedTotal, recordedPayments, urgent] =
    await Promise.all([
      db.payment.findMany({
        where: { userId, dueDate: range },
        orderBy: { dueDate: "asc" },
      }),
      db.receipt.findMany({ where: { userId, expectedAt: range } }),
      db.payment.findMany({
        where: {
          userId,
          dueDate: { gte: period.end },
          status: { not: "PAID" },
        },
      }),
      db.receipt.aggregate({
        where: { userId, receivedAt: { lte: new Date() } },
        _sum: { amount: true },
      }),
      db.payment.findMany({
        where: { userId, OR: [{ status: "PAID" }, { paidAmount: { gt: 0 } }] },
      }),
      db.payment.findMany({
        where: {
          userId,
          status: { not: "PAID" },
          dueDate: { lte: attentionEnd },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);
  const realized =
    (cents(receivedTotal._sum.amount ?? 0) -
      recordedPayments.reduce((sum, p) => sum + cents(paidValue(p)), 0)) /
    100;
  const summary = totals(payments, receipts);
  const pending = payments.filter((p) => remaining(p) > 0);
  return (
    <AppShell active="/dashboard" userName={user.name}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">VISÃO GERAL</span>
            <h1>Olá, {user.name.split(" ")[0]} 👋</h1>
            <p>Organização financeira de {period.label}.</p>
          </div>
          <PaymentForm />
        </div>
        <section className="panel realized-balance">
          <div>
            <h2>Saldo realizado registrado</h2>
            <p>
              Todos os períodos: receitas recebidas menos pagamentos registrados
              até hoje. Sem saldo bancário inicial.
            </p>
          </div>
          <strong>{brl.format(realized)}</strong>
        </section>
        <PeriodPicker action="/dashboard" month={period.key} />
        {summary.income === 0 && (
          <section className="panel guidance-card">
            <div>
              <h2>Adicione suas receitas de {period.label}</h2>
              <p>
                Sem receitas cadastradas, a previsão considera apenas as contas.
                Cadastre suas entradas para planejar o mês.
              </p>
            </div>
            <ReceiptForm initialDate={period.key + "-01"} />
          </section>
        )}
        <div className="stats-grid">
          {[
            [
              "Saldo previsto do mês",
              summary.projected,
              "Receitas previstas menos o valor total das contas do mês.",
            ],
            [
              "A pagar no mês",
              summary.pending,
              `${pending.length} contas com saldo restante, incluindo parciais.`,
            ],
            [
              "Pago das contas do mês",
              summary.paid,
              "Inclui pagamentos parciais das contas com vencimento neste mês.",
            ],
            [
              "Receitas previstas",
              summary.income,
              `${receipts.length} entradas com previsão neste mês.`,
            ],
          ].map(([label, value, help]) => (
            <div className="stat-card" key={String(label)}>
              <small>{label}</small>
              <strong>{brl.format(Number(value))}</strong>
              <span>{help}</span>
            </div>
          ))}
        </div>
        <p className="period-note">
          Os totais usam o vencimento das contas e a data prevista das receitas.
          O saldo previsto não é seu saldo bancário. Compromissos após este mês:{" "}
          <b>{brl.format(future.reduce((s, p) => s + remaining(p), 0))}</b>.
        </p>
        <section className="panel attention-panel">
          <div className="panel-head">
            <div>
              <h2>Precisa da sua atenção</h2>
              <p>
                Vencimentos em relação a hoje, incluindo atrasos de meses
                anteriores. Independente do mês selecionado.
              </p>
            </div>
          </div>
          <div className="attention-grid">
            {(["OVERDUE", "TODAY", "UPCOMING"] as const).map((kind) => {
              const group = urgent.filter((p) => urgency(p, today) === kind);
              return (
                <Link
                  key={kind}
                  href={`/pagamentos?status=${kind}&month=${period.key}`}
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
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Contas a pagar de {period.label}</h2>
              <p>
                Ordenadas por vencimento. Valores mostram o que falta pagar.
              </p>
            </div>
            <Link
              href={`/pagamentos?month=${period.key}`}
              className="text-link"
            >
              Ver todas
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="empty">Nenhuma conta pendente neste mês.</div>
          ) : (
            <div className="table-wrap">
              <table>
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
                      <td>
                        <Link
                          className="text-link"
                          href={`/pagamentos?month=${period.key}#conta-${p.id}`}
                        >
                          {p.name}
                        </Link>
                        <small>{p.category}</small>
                      </td>
                      <td>
                        {shortDate.format(p.dueDate)}
                        <DueBadge payment={p} />
                      </td>
                      <td>{brl.format(remaining(p))}</td>
                      <td>
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
