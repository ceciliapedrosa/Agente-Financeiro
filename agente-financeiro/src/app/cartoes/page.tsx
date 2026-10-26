import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import CardForm from "@/components/CardForm";
import RecordManager from "@/components/RecordManager";
import PaymentAction from "@/components/PaymentAction";
import PeriodPicker from "@/components/PeriodPicker";
import StatusBadge from "@/components/StatusBadge";
import { managedProps } from "@/lib/managed-props";
import { brl } from "@/lib/format";
import { cents, monthPeriod, paidValue, remaining } from "@/lib/finance";
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; archived?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  const query = await searchParams,
    period = monthPeriod(query.month);
  const [cards, payments] = await Promise.all([
    db.card.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        invoices: { where: { month: period.key }, include: { payment: true } },
      },
    }),
    db.payment.findMany({
      where: { userId, cancelledAt: null, seriesId: null, invoice: null },
      select: { id: true, name: true, amount: true },
      orderBy: { dueDate: "desc" },
    }),
  ]);
  const invoices = cards
    .flatMap((c) => c.invoices)
    .filter((i) => !i.payment.cancelledAt);
  const pending =
    invoices.reduce((s, i) => s + cents(remaining(i.payment)), 0) / 100;
  const paid =
    invoices.reduce((s, i) => s + cents(paidValue(i.payment)), 0) / 100;
  const unresolved = cards.filter(
    (c) => !c.invoiceReviewedAt && c.currentInvoice > 0,
  );
  const shown = cards.filter((c) =>
    query.archived === "1" ? !!c.archivedAt : !c.archivedAt,
  );
  return (
    <AppShell active="/cartoes" userName={user.name} month={period.key}>
      <main className="page">
        <div className="page-head">
          <div>
            <span className="kicker">CRÉDITO</span>
            <h1>Cartões e faturas</h1>
            <p>
              Faturas de {period.label}. Cada fatura usa uma única despesa no
              planejamento.
            </p>
          </div>
          <CardForm />
        </div>
        <PeriodPicker action="/cartoes" month={period.key} />
        <div className="tabs">
          <Link
            className={`tab ${query.archived !== "1" ? "active" : ""}`}
            href={`/cartoes?month=${period.key}`}
          >
            Ativos
          </Link>
          <Link
            className={`tab ${query.archived === "1" ? "active" : ""}`}
            href={`/cartoes?month=${period.key}&archived=1`}
          >
            Arquivados
          </Link>
        </div>
        {unresolved.length > 0 && (
          <section className="panel guidance-card">
            <div>
              <h2>{unresolved.length} fatura(s) antiga(s) a confirmar</h2>
              <p>
                Os valores antigos não tinham competência nem situação de
                pagamento. Use “Adicionar / confirmar fatura” para informar o
                mês e vincular uma conta existente ou criar uma despesa. Até lá,
                esses valores não compõem os totais de faturas confirmadas.
              </p>
            </div>
          </section>
        )}
        <div className="stats-grid">
          {[
            [
              "Limite dos cartões ativos",
              cards
                .filter((c) => !c.archivedAt)
                .reduce((s, c) => s + cents(c.creditLimit), 0) / 100,
            ],
            ["A pagar · competência selecionada", pending],
            ["Pago · competência selecionada", paid],
          ].map(([label, value]) => (
            <div className="stat-card" key={String(label)}>
              <small>{label}</small>
              <strong>{brl.format(Number(value))}</strong>
              <span>Faturas confirmadas incluem cartões arquivados.</span>
            </div>
          ))}
        </div>
        <p className="period-note">
          O painel considera o mês do vencimento real da despesa; esta tela usa
          a competência da fatura. Arquivar um cartão não cancela suas dívidas.
        </p>
        <div className="card-grid">
          {shown.map((c) => (
            <section className="panel managed-card" key={c.id}>
              <div className="credit-card-item">
                <small>
                  {c.institution}
                  {c.archivedAt ? " · Arquivado" : ""}
                </small>
                <h2>{c.name}</h2>
                <div className="credit-card-meta">
                  <span>Limite {brl.format(c.creditLimit)}</span>
                  <span>Fecha dia {c.closingDay}</span>
                  <span>Vence dia {c.dueDay}</span>
                </div>
              </div>
              <div className="managed-card-body">
                {!c.invoiceReviewedAt && c.currentInvoice > 0 && (
                  <p className="period-note">
                    Valor antigo a confirmar:{" "}
                    <strong>{brl.format(c.currentInvoice)}</strong>
                  </p>
                )}
                <RecordManager
                  kind="CARD"
                  record={managedProps(c)}
                  payments={payments}
                />
                {c.invoices.length === 0 ? (
                  <p>Nenhuma fatura confirmada em {period.label}.</p>
                ) : (
                  c.invoices.map((i) => (
                    <div className="invoice-detail" key={i.id}>
                      <h3>Fatura {i.month.split("-").reverse().join("/")}</h3>
                      <p>
                        Vencimento: {date.format(i.payment.dueDate)} · Total:{" "}
                        {brl.format(i.payment.amount)}
                      </p>
                      <p>
                        Pago: {brl.format(paidValue(i.payment))} · Restante:{" "}
                        {brl.format(remaining(i.payment))}
                      </p>
                      {i.payment.cancelledAt ? (
                        <span className="status pending">
                          Cancelada — fora dos totais
                        </span>
                      ) : (
                        <StatusBadge status={i.payment.status} />
                      )}
                      {!i.payment.cancelledAt && (
                        <PaymentAction
                          id={i.payment.id}
                          updatedAt={i.payment.updatedAt.toISOString()}
                          paid={paidValue(i.payment)}
                          remaining={remaining(i.payment)}
                        />
                      )}
                      <RecordManager
                        kind="PAYMENT"
                        record={{
                          ...managedProps(i.payment),
                          invoiceMonth: i.month,
                        }}
                      />
                      <Link
                        className="text-link"
                        href={`/pagamentos?month=all${i.payment.cancelledAt ? "&status=CANCELLED" : ""}#conta-${i.payment.id}`}
                      >
                        Abrir despesa e histórico de pagamentos
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
        {!shown.length && (
          <section className="panel">
            <p>
              {query.archived === "1"
                ? "Nenhum cartão arquivado."
                : "Cadastre seu primeiro cartão para acompanhar as faturas."}
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
