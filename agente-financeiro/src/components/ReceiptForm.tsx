"use client";
import { useState } from "react";
import Modal from "./Modal";
import RecurrenceFields from "./RecurrenceFields";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function ReceiptForm({
  initialDate = "",
}: {
  initialDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [firstDate, setFirstDate] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar a receita.");
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
        className="btn primary"
        onClick={() => {
          setFirstDate(initialDate);
          setError("");
          setOpen(true);
        }}
      >
        <Plus size={17} /> Nova receita
      </button>
      {open && (
        <Modal
          title="Nova receita"
          description="Cadastre uma entrada prevista ou já recebida."
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form className="grid-form" onSubmit={submit}>
            <label className="span2">
              Descrição
              <input name="name" placeholder="Ex.: Salário" required />
            </label>
            <label>
              Valor
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </label>
            <label>
              Data prevista
              <input
                name="expectedAt"
                type="date"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
                required
              />
            </label>
            <label>
              Categoria
              <select name="category">
                <option>Salário</option>
                <option>Freelance</option>
                <option>Vendas</option>
                <option>Investimentos</option>
                <option>Reembolso</option>
                <option>Outros</option>
              </select>
            </label>
            <label>
              Status
              <select name="status">
                <option value="PENDING">Prevista</option>
                <option value="RECEIVED">Recebida</option>
              </select>
            </label>
            <RecurrenceFields start={firstDate} />
            {error && (
              <div role="alert" className="form-error span2">
                {error}
              </div>
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
                {busy ? "Salvando..." : "Salvar receita"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
