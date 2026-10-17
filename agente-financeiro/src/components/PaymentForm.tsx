"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import { TextInput, MoneyInput, DateInput } from "./FormInputs";
import RecurrenceFields from "./RecurrenceFields";
import { todayISO } from "@/lib/finance";
export type EditablePayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  priority: string;
  recurrence: string;
  notes: string | null;
  updatedAt: string;
};
export default function PaymentForm({
  payment,
  buttonLabel = "Nova conta",
}: {
  payment?: EditablePayment;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("PENDING");
  const [firstDate, setFirstDate] = useState(payment?.dueDate ?? "");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...Object.fromEntries(new FormData(e.currentTarget)),
      ...(payment
        ? { id: payment.id, updatedAt: payment.updatedAt, action: "edit" }
        : {}),
    };
    try {
      const r = await fetch("/api/payments", {
        method: payment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Não foi possível salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={payment ? "small-action" : "btn primary"}
        onClick={() => {
          setError("");
          setStatus("PENDING");
          setFirstDate(payment?.dueDate ?? "");
          setOpen(true);
        }}
      >
        {!payment && <Plus size={17} />}{" "}
        {payment ? "Editar conta" : buttonLabel}
      </button>
      {open && (
        <Modal
          title={payment ? "Editar conta" : "Nova conta"}
          description={
            payment
              ? "Atualize os dados. Os pagamentos registrados serão preservados."
              : "Cadastre um pagamento e defina sua prioridade."
          }
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form className="grid-form" onSubmit={submit}>
            <label className="span2">
              Nome da conta
              <TextInput
                name="name"
                defaultValue={payment?.name}
                placeholder="Ex.: Aluguel"
                maxLength={200}
                required
              />
            </label>
            <label>
              Valor (R$)
              <MoneyInput name="amount" defaultValue={payment?.amount} />
            </label>
            <label>
              Vencimento
              <DateInput
                name="dueDate"
                value={firstDate}
                onChange={setFirstDate}
              />
            </label>
            <label>
              Categoria
              <select name="category" defaultValue={payment?.category}>
                {Array.from(
                  new Set([
                    "Moradia",
                    "Alimentação",
                    "Transporte",
                    "Saúde",
                    "Educação",
                    "Lazer",
                    "Cartão",
                    "Outros",
                    ...(payment ? [payment.category] : []),
                  ]),
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select
                name="priority"
                defaultValue={payment?.priority ?? "ESSENTIAL"}
              >
                <option value="ESSENTIAL">Essencial</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </label>
            {payment ? (
              <>
                <input
                  type="hidden"
                  name="recurrence"
                  value={payment.recurrence}
                />
                <p className="span2 field-hint">
                  A edição afeta somente este lançamento. Para criar novas
                  ocorrências, use “Nova conta”.
                </p>
              </>
            ) : (
              <RecurrenceFields start={firstDate} />
            )}
            {!payment && (
              <label>
                Status
                <select
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PENDING">A pagar</option>
                  <option value="PAID">Pago</option>
                  <option value="PARTIAL">Parcial</option>
                </select>
              </label>
            )}
            {!payment && status === "PARTIAL" && (
              <label>
                Valor já pago (R$)
                <MoneyInput name="paidAmount" />
              </label>
            )}
            {!payment && status !== "PENDING" && (
              <label>
                Data do pagamento
                <DateInput
                  name="paidAt"
                  defaultValue={todayISO()}
                  max={todayISO()}
                />
              </label>
            )}
            <label className="span2">
              Observações
              <textarea
                name="notes"
                defaultValue={payment?.notes ?? ""}
                maxLength={5000}
              />
            </label>
            {error && (
              <p className="form-error span2" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions span2">
              <button
                type="button"
                data-modal-close
                className="btn secondary"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Salvando..." : "Salvar conta"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
