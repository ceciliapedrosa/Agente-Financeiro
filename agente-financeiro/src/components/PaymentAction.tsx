"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { MoneyInput, DateInput } from "./FormInputs";
import { brl } from "@/lib/format";
import { todayISO } from "@/lib/finance";
export default function PaymentAction({
  id,
  updatedAt,
  remaining,
  paid,
}: {
  id: string;
  updatedAt: string;
  remaining: number;
  paid: number;
}) {
  const [action, setAction] = useState<"payment" | "settle" | "reopen" | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(e.currentTarget)),
          id,
          updatedAt,
          action,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Não foi possível atualizar.");
        return;
      }
      setAction(null);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  function open(value: typeof action) {
    setError("");
    setAction(value);
  }
  return (
    <>
      <div className="row-actions">
        {remaining > 0 && (
          <>
            <button className="small-action" onClick={() => open("payment")}>
              Registrar pagamento
            </button>
            <button className="small-action" onClick={() => open("settle")}>
              Quitar restante
            </button>
          </>
        )}
        {paid > 0 && (
          <button className="small-action" onClick={() => open("reopen")}>
            Reabrir conta
          </button>
        )}
      </div>
      {action && (
        <Modal
          title={
            action === "reopen"
              ? "Reabrir conta"
              : action === "settle"
                ? "Quitar restante"
                : "Registrar pagamento"
          }
          description={
            action === "reopen"
              ? `O total pago de ${brl.format(paid)} será estornado no controle. O histórico será mantido. Isso não movimenta sua conta bancária.`
              : `Restam ${brl.format(remaining)}. Informe o pagamento feito; isso não movimenta sua conta bancária.`
          }
          onClose={() => setAction(null)}
          busy={busy}
        >
          <form className="grid-form" onSubmit={submit}>
            {action === "payment" && (
              <label>
                Valor deste pagamento (R$)
                <MoneyInput name="amount" max={remaining} />
              </label>
            )}
            {action !== "reopen" && (
              <label>
                Data do pagamento
                <DateInput
                  name="paidAt"
                  defaultValue={todayISO()}
                  max={todayISO()}
                />
              </label>
            )}
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
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={busy}>
                {busy
                  ? "Salvando..."
                  : action === "reopen"
                    ? "Confirmar reabertura"
                    : "Confirmar pagamento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
