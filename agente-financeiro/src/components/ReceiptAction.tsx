"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "./Modal";
import { DateInput } from "./FormInputs";
import { todayISO } from "@/lib/finance";
export default function ReceiptAction({
  id,
  receivedAt,
  name,
}: {
  id: string;
  receivedAt: string | null;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/receipts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          receivedAt: new FormData(e.currentTarget).get("receivedAt"),
          expectedReceivedAt: receivedAt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível registrar o recebimento.");
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
      <div className="receipt-actions">
        <span className={`status ${receivedAt ? "paid" : "pending"}`}>
          {receivedAt ? "Recebida" : "Prevista"}
        </span>
        <button
          className="small-action"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          {receivedAt ? "Corrigir data" : "Registrar recebimento"}
        </button>
      </div>
      {open && (
        <Modal
          title={
            receivedAt
              ? "Corrigir data de recebimento"
              : "Registrar recebimento"
          }
          description={`Informe quando o dinheiro de “${name}” realmente entrou. A data prevista será mantida. Isso não movimenta sua conta bancária.`}
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form className="grid-form" onSubmit={submit}>
            <label className="span2">
              Data efetiva do recebimento
              <DateInput
                name="receivedAt"
                defaultValue={receivedAt?.slice(0, 10) ?? todayISO()}
                max={todayISO()}
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
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Salvando..." : "Salvar recebimento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
