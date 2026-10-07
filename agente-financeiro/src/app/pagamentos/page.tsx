import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { monthPeriod, remaining, paidValue, todayISO } from "@/lib/finance";
import AppShell from "@/components/AppShell";
import PaymentForm from "@/components/PaymentForm";
import PaymentAction from "@/components/PaymentAction";
import PeriodPicker from "@/components/PeriodPicker";
import StatusBadge from "@/components/StatusBadge";
import DueBadge from "@/components/DueBadge";
import { urgency } from "@/lib/urgency";
const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const query = await searchParams;
  const period = monthPeriod(query.month);
  const status = query.status ?? "ALL";
  const urgentFilter = ["OVERDUE", "TODAY", "UPCOMING"].includes(status);
  const today = todayISO();
  const end = new Date(today + "T23:59:59Z");
  end.setUTCDate(end.getUTCDate() + 7);
  const all = await db.payment.findMany({
    where: {
      userId,
      ...(urgentFilter
        ? { status: { not: "PAID" as const }, dueDate: { lte: end } }
        : { dueDate: { gte: period.start, lt: period.end } }),
    },
    orderBy: { dueDate: "asc" },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  const payments = all.filter((p) =>
    urgentFilter
      ? urgency(p, today) === status
      : status === "PENDING"
        ? remaining(p) > 0
        : status === "PAID" || status === "PARTIAL"
          ? p.status === status
          : true,
  );
  const tabs = [
    ["ALL", "Todos"],
    ["PENDING", "A pagar"],
    ["TODAY", "Vencem hoje"],
    ["UPCOMING", "Próximos 7 dias"],
    ["OVERDUE", "Atrasados"],
    ["PAID", "Pagos"],
    ["PARTIAL", "Parciais"],
  ];
  return (
    <AppShell active="/pagamentos" userName={user.name}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">CONTROLE</span>
            <h1>Pagamentos</h1>
            <p>
              {urgentFilter
                ? "Vencimentos em relação a hoje, incluindo outros meses. O filtro de mês não limita esta lista."
                : `Contas com vencimento em ${period.label}. Abra o nome para ver detalhes.`}
            </p>
          </div>
          <PaymentForm />
        </div>
        {!urgentFilter && (
          <PeriodPicker
            action="/pagamentos"
            month={period.key}
            status={status}
          />
        )}
        <div className="tabs">
          {tabs.map(([key, label]) => (
            <a
              key={key}
              href={`/pagamentos?status=${key}&month=${period.key}`}
              className={status === key ? "tab active" : "tab"}
            >
              {label}
            </a>
          ))}
        </div>
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conta e detalhes</th>
                  <th>Vencimento</th>
                  <th>Total / pago / restante</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr id={`conta-${p.id}`} key={p.id}>
                    <td>
                      <details className="payment-details">
                        <summary>{p.name}</summary>
                        <p>Categoria: {p.category}</p>
                        <p>
                          Prioridade:{" "}
                          {
                            {
                              ESSENTIAL: "Essencial",
                              HIGH: "Alta",
                              MEDIUM: "Média",
                              LOW: "Baixa",
                            }[p.priority]
                          }
                        </p>
                        <p>
                          Recorrência:{" "}
                          {
                            {
                              NONE: "Não recorrente",
                              MONTHLY: "Mensal",
                              YEARLY: "Anual",
                            }[p.recurrence]
                          }
                        </p>
                        {p.notes && <p>{p.notes}</p>}
                        <h3>Histórico de pagamentos</h3>
                        {p.events.length ? (
                          <ol>
                            {p.events.map((e) => (
                              <li key={e.id}>
                                {dateFormat.format(e.paidAt)} —{" "}
                                {e.kind === "REVERSAL"
                                  ? "Estorno"
                                  : e.kind === "LEGACY"
                                    ? "Saldo pago anterior"
                                    : "Pagamento"}
                                : {brl.format(e.amount)}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p>
                            {paidValue(p) > 0
                              ? `Valor pago anterior: ${brl.format(paidValue(p))}. Sem detalhamento de parcelas antigas.`
                              : "Nenhum pagamento registrado."}
                          </p>
                        )}
                      </details>
                    </td>
                    <td>
                      {dateFormat.format(p.dueDate)}
                      <DueBadge payment={p} />
                    </td>
                    <td>
                      <b>{brl.format(p.amount)}</b>
                      <small>Pago: {brl.format(paidValue(p))}</small>
                      <small>Restante: {brl.format(remaining(p))}</small>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <PaymentForm
                          payment={{
                            id: p.id,
                            name: p.name,
                            amount: p.amount,
                            dueDate: p.dueDate.toISOString().slice(0, 10),
                            category: p.category,
                            priority: p.priority,
                            recurrence: p.recurrence,
                            notes: p.notes,
                            updatedAt: p.updatedAt.toISOString(),
                          }}
                        />
                        <PaymentAction
                          id={p.id}
                          updatedAt={p.updatedAt.toISOString()}
                          remaining={remaining(p)}
                          paid={paidValue(p)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments.length && (
              <div className="empty">Nenhuma conta neste período e filtro.</div>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
