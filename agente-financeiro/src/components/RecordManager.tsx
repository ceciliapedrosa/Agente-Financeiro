"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { DateInput, MoneyInput, TextInput, MonthInput } from "./FormInputs";
import { todayISO } from "@/lib/finance";
import { brl } from "@/lib/format";
export type ManagedRecord = {
  id: string;
  name: string;
  updatedAt: string;
  amount?: number;
  category?: string;
  priority?: string;
  notes?: string | null;
  date?: string;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  seriesId?: string | null;
  seriesIndex?: number | null;
  recurring?: boolean;
  institution?: string;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  archivedAt?: string | null;
  currentInvoice?: number;
  invoiceMonth?: string;
};
type Occurrence = {
  id: string;
  name: string;
  amount: number;
  seriesIndex: number;
  dueDate?: string;
  expectedAt?: string;
  receivedAt?: string;
  paidAmount?: number;
  status?: string;
  cancelledAt?: string;
};
type History = {
  id: string;
  action: string;
  createdAt: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};
const labels: Record<string, string> = {
  invoiceperiod: "Competência corrigida",
  edit: "Editar",
  cancel: "Cancelar lançamento",
  restore: "Restaurar",
  receive: "Registrar recebimento",
  reverse: "Desfazer recebimento",
  stop: "Encerrar sequência",
  archive: "Arquivar cartão",
  unarchive: "Restaurar cartão",
  invoice: "Adicionar / confirmar fatura",
  history: "Histórico e sequência",
  payment: "Pagamento registrado",
  settle: "Quitação",
  reopen: "Estorno de pagamento",
};
const dateLabel = (s?: string | null) =>
  s
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(s))
    : "—";
const fields: Record<string, string> = {
  name: "Nome",
  category: "Categoria",
  priority: "Prioridade",
  notes: "Observações",
  amount: "Valor",
  dueDate: "Vencimento",
  expectedAt: "Data prevista",
  receivedAt: "Recebimento",
  paidAmount: "Total pago",
  cancelledAt: "Cancelamento",
  creditLimit: "Limite",
  closingDay: "Dia de fechamento",
  dueDay: "Dia de vencimento",
  archivedAt: "Arquivamento",
  month: "Competência",
  paymentId: "Despesa vinculada",
};
function display(key: string, value: unknown) {
  if (value == null) return "—";
  if (["amount", "paidAmount", "creditLimit"].includes(key))
    return brl.format(Number(value));
  if (
    [
      "dueDate",
      "expectedAt",
      "receivedAt",
      "cancelledAt",
      "archivedAt",
    ].includes(key)
  )
    return dateLabel(String(value));
  return String(value);
}
export default function RecordManager({
  kind,
  record: r,
  payments = [],
}: {
  kind: "PAYMENT" | "RECEIPT" | "CARD";
  record: ManagedRecord;
  payments?: { id: string; name: string; amount: number }[];
}) {
  const router = useRouter(),
    request = useRef(0);
  const [action, setAction] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [scope, setScope] = useState("ONE"),
    [link, setLink] = useState(""),
    [history, setHistory] = useState<History[]>([]),
    [occurrences, setOccurrences] = useState<Occurrence[]>([]),
    [loading, setLoading] = useState(false),
    [version, setVersion] = useState("");
  async function open(next: string) {
    const token = ++request.current;
    setAction(next);
    setScope(next === "stop" ? "FUTURE" : "ONE");
    setLink("");
    setError("");
    setMessage("");
    setHistory([]);
    setOccurrences([]);
    setVersion("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/manage?kind=${kind}&id=${encodeURIComponent(r.id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (request.current === token) {
        setHistory(data.history);
        setOccurrences(data.occurrences);
        setVersion(data.seriesVersion);
      }
    } catch (e) {
      if (request.current === token)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o histórico.",
        );
    } finally {
      if (request.current === token) setLoading(false);
    }
  }
  function close() {
    request.current++;
    setAction("");
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          kind,
          id: r.id,
          updatedAt: r.updatedAt,
          action,
          scope,
          seriesVersion: version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      close();
      setMessage(
        `${data.changed} registro(s) atualizado(s).${data.skipped ? ` ${data.skipped} ocorrência(s) concluída(s) ou cancelada(s) preservada(s).` : ""}`,
      );
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const actions =
    kind === "CARD"
      ? r.archivedAt
        ? ["unarchive", "history"]
        : ["edit", "invoice", "archive", "history"]
      : r.cancelledAt
        ? ["restore", "history"]
        : [
            "edit",
            ...(kind === "RECEIPT"
              ? ["receive", ...(r.receivedAt ? ["reverse"] : [])]
              : []),
            "cancel",
            ...(r.seriesId ? ["stop"] : []),
            "history",
          ];
  const affected = occurrences.filter(
    (o) => scope === "ALL" || o.seriesIndex >= (r.seriesIndex ?? 0),
  );
  const eligible = affected.filter(
    (o) =>
      !o.cancelledAt &&
      !o.receivedAt &&
      o.status !== "PAID" &&
      !(o.paidAmount && o.paidAmount > 0),
  );
  return (
    <>
      <details className="record-menu">
        <summary>Gerenciar {kind === "CARD" ? "cartão" : "lançamento"}</summary>
        <div className="row-actions">
          {actions.map((a) => (
            <button
              key={a}
              className="small-action"
              onClick={() => open(a)}
              aria-label={`${a === "receive" && r.receivedAt ? "Corrigir recebimento" : labels[a]}: ${r.name}`}
            >
              {a === "receive" && r.receivedAt
                ? "Corrigir recebimento"
                : labels[a]}
            </button>
          ))}
        </div>
      </details>
      {message && <p role="status">{message}</p>}
      {action && (
        <Modal
          title={`${labels[action]} · ${r.name}`}
          onClose={close}
          busy={busy}
          description="As alterações ficam no histórico. Nenhuma ação movimenta sua conta bancária."
        >
          <form className="grid-form" onSubmit={submit}>
            {action === "edit" && (
              <>
                <label>
                  Nome
                  <TextInput
                    name="name"
                    defaultValue={r.name}
                    maxLength={200}
                    required
                  />
                </label>
                {kind === "CARD" ? (
                  <>
                    <label>
                      Instituição
                      <TextInput
                        name="institution"
                        defaultValue={r.institution}
                        required
                      />
                    </label>
                    <label>
                      Limite
                      <MoneyInput
                        name="creditLimit"
                        defaultValue={r.creditLimit}
                        min={0}
                      />
                    </label>
                    <label>
                      Dia de fechamento
                      <TextInput
                        name="closingDay"
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={r.closingDay}
                        required
                      />
                    </label>
                    <label>
                      Dia de vencimento
                      <TextInput
                        name="dueDay"
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={r.dueDay}
                        required
                      />
                    </label>
                    <p className="span2">
                      As datas das faturas cadastradas serão mantidas. Edite
                      cada fatura para corrigi-las.
                    </p>
                  </>
                ) : (
                  <>
                    <label>
                      Categoria
                      <TextInput
                        name="category"
                        defaultValue={r.category}
                        maxLength={100}
                        required
                      />
                    </label>
                    <label>
                      Valor
                      <MoneyInput name="amount" defaultValue={r.amount} />
                    </label>
                    <label>
                      {kind === "PAYMENT" ? "Vencimento" : "Data prevista"}
                      <DateInput
                        name="date"
                        defaultValue={r.date?.slice(0, 10)}
                      />
                    </label>
                    {kind === "PAYMENT" && <>
                      <label>Prioridade<select name="priority" defaultValue={r.priority ?? "ESSENTIAL"}>
                        <option value="ESSENTIAL">Essencial</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option>
                      </select></label>
                      <label className="span2">Observações<textarea name="notes" defaultValue={r.notes ?? ""} maxLength={2000}/></label>
                    </>}
                    {r.receivedAt && (
                      <p className="span2">
                        Esta receita já foi recebida. Corrigir o valor também
                        ajusta o saldo realizado; o valor anterior permanece no
                        histórico.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {action === "edit" && r.invoiceMonth && (
              <label className="span2">
                Competência da fatura
                <MonthInput month={r.invoiceMonth} />
              </label>
            )}
            {action === "receive" && (
              <label className="span2">
                Recebimento de {brl.format(r.amount ?? 0)} · data efetiva
                <DateInput
                  name="date"
                  defaultValue={r.receivedAt?.slice(0, 10) ?? todayISO()}
                  max={todayISO()}
                />
              </label>
            )}
            {action === "invoice" && (
              <>
                <p className="span2">
                  A fatura será uma única despesa no planejamento. Se já
                  cadastrou essa conta em Pagamentos, vincule-a para evitar
                  duplicidade. Depois, registre o pagamento nas ações da fatura.
                </p>
                <label>
                  Competência
                  <MonthInput month={todayISO().slice(0, 7)} />
                </label>
                <label>
                  Origem
                  <select
                    name="paymentId"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  >
                    <option value="">Criar nova despesa em aberto</option>
                    {payments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {brl.format(p.amount)}
                      </option>
                    ))}
                  </select>
                </label>
                {!link && (
                  <>
                    <label>
                      Valor da fatura
                      <MoneyInput
                        name="amount"
                        defaultValue={r.currentInvoice || undefined}
                      />
                    </label>
                    <label>
                      Vencimento real
                      <DateInput
                        name="date"
                        defaultValue={`${todayISO().slice(0, 7)}-${String(Math.min(r.dueDay ?? 1, new Date(Number(todayISO().slice(0, 4)), Number(todayISO().slice(5, 7)), 0).getDate())).padStart(2, "0")}`}
                      />
                    </label>
                  </>
                )}
              </>
            )}
            {["cancel", "restore"].includes(action) && (
              <p className="span2">
                {action === "cancel"
                  ? "O lançamento será retirado dos totais previstos e realizados, inclusive valores pagos ou recebidos. O histórico permanece. Para recuperar, use o filtro Cancelados."
                  : "O lançamento voltará aos totais com os valores, pagamentos e recebimentos anteriores ao cancelamento."}
              </p>
            )}
            {action === "reverse" && (
              <p className="span2">
                O valor sai do saldo realizado e volta a ficar a receber. A
                previsão e o histórico serão preservados.
              </p>
            )}
            {action === "archive" && (
              <p className="span2">
                O cartão sai da lista de ativos. Suas faturas e dívidas
                continuam no planejamento e podem ser pagas normalmente.
              </p>
            )}
            {action === "stop" && (
              <p className="span2">
                Cancela esta ocorrência e as seguintes ainda não pagas ou
                recebidas. A sequência é finita e não se renova automaticamente.
                Você pode restaurar as canceladas individualmente.
              </p>
            )}
            {r.seriesId && ["edit", "cancel", "stop"].includes(action) && (
              <>
                <label className="span2">
                  Aplicar a
                  <select
                    name="scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    disabled={action === "stop"}
                  >
                    {action !== "stop" && (
                      <option value="ONE">Somente esta ocorrência</option>
                    )}
                    <option value="FUTURE">Esta e as próximas</option>
                    {action !== "stop" && (
                      <option value="ALL">Toda a sequência</option>
                    )}
                  </select>
                </label>
                {scope !== "ONE" && (
                  <p className="span2">
                    {loading
                      ? "Calculando ocorrências…"
                      : `${eligible.length} ocorrência(s) em aberto serão alteradas; ${affected.length - eligible.length} paga(s), recebida(s) ou cancelada(s) serão preservadas.`}{" "}
                    As datas mantêm a distância em meses entre ocorrências.
                  </p>
                )}
              </>
            )}
            {action === "history" && (
              <div className="span2">
                {loading ? (
                  <p>Carregando…</p>
                ) : (
                  <>
                    {occurrences.length > 0 ? (
                      <>
                        <h3>Ocorrências da sequência</h3>
                        <ol>
                          {occurrences.map((o) => (
                            <li key={o.id}>
                              {dateLabel(o.dueDate ?? o.expectedAt)} · {o.name}{" "}
                              · {brl.format(o.amount)} ·{" "}
                              {o.cancelledAt
                                ? "Cancelada"
                                : o.receivedAt || o.status === "PAID"
                                  ? "Concluída"
                                  : o.paidAmount
                                    ? "Parcial"
                                    : "Em aberto"}
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : r.recurring ? (
                      <p>
                        Recorrência antiga sem sequência identificada. Edite as
                        ocorrências individualmente. Novos cadastros recorrentes
                        permitem gerenciar a sequência.
                      </p>
                    ) : null}
                    <h3>Histórico de alterações</h3>
                    {!history.length && (
                      <p>
                        Nenhuma alteração registrada desde esta atualização. Os
                        valores anteriores serão preservados na primeira
                        alteração.
                      </p>
                    )}
                    <ol>
                      {history.map((h) => (
                        <li key={h.id}>
                          {dateLabel(h.createdAt)} ·{" "}
                          {labels[h.action] ?? h.action}
                          <details>
                            <summary>Antes e depois</summary>
                            {Object.entries(fields)
                              .filter(
                                ([k]) =>
                                  h.before[k] !== undefined ||
                                  h.after[k] !== undefined,
                              )
                              .map(([k, label]) => (
                                <p key={k}>
                                  {label}: {display(k, h.before[k])} →{" "}
                                  {display(k, h.after[k])}
                                </p>
                              ))}
                          </details>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="form-error span2">
                {error}
              </p>
            )}
            <div className="modal-actions span2">
              <button
                type="button"
                data-modal-close
                className="btn secondary"
                disabled={busy}
              >
                Fechar
              </button>
              {action !== "history" && (
                <button
                  className="btn primary"
                  disabled={busy || loading || (scope !== "ONE" && !version)}
                >
                  {busy ? "Salvando…" : action === "receive" ? `${r.receivedAt ? "Corrigir" : "Registrar"} recebimento de ${brl.format(r.amount ?? 0)}` : action === "edit" ? "Salvar alterações" : labels[action]}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
