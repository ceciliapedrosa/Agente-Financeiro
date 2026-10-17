"use client";
import { useState } from "react";
import Modal from "./Modal";
import { TextInput, MoneyInput } from "./FormInputs";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function CardForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar o cartão.");
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
      <button className="btn primary" onClick={() => setOpen(true)}>
        <Plus size={17} /> Novo cartão
      </button>
      {open && (
        <Modal
          title="Novo cartão"
          description="Cadastre limite, fatura e datas principais."
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form className="grid-form" onSubmit={submit}>
            <label>
              Nome do cartão
              <TextInput name="name" placeholder="Ex.: Nubank" required />
            </label>
            <label>
              Instituição
              <TextInput
                name="institution"
                placeholder="Ex.: Nubank"
                required
              />
            </label>
            <label>
              Limite
              <MoneyInput name="creditLimit" min={0} />
            </label>
            <label>
              Fatura atual
              <MoneyInput name="currentInvoice" defaultValue={0} min={0} />
            </label>
            <label>
              Dia de fechamento
              <TextInput
                name="closingDay"
                type="number"
                min="1"
                max="31"
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
                required
              />
            </label>
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
                {busy ? "Salvando..." : "Salvar cartão"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
