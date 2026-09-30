"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function CardForm(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    const payload=Object.fromEntries(new FormData(e.currentTarget).entries());
    const res=await fetch("/api/cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({})); setBusy(false);
    if(!res.ok){setError(data.error||"Não foi possível salvar o cartão.");return;}
    setOpen(false); router.refresh();
  }
  return <>
    <button className="btn primary" onClick={()=>setOpen(true)}><Plus size={17}/> Novo cartão</button>
    {open&&<div className="modal-wrap"><div className="modal-card">
      <div className="modal-head"><div><h2>Novo cartão</h2><p>Cadastre limite, fatura e datas principais.</p></div><button className="icon-btn" onClick={()=>setOpen(false)}><X/></button></div>
      <form className="grid-form" onSubmit={submit}>
        <label>Nome do cartão<input name="name" placeholder="Ex.: Nubank" required/></label>
        <label>Instituição<input name="institution" placeholder="Ex.: Nubank" required/></label>
        <label>Limite<input name="creditLimit" type="number" min="0" step="0.01" required/></label>
        <label>Fatura atual<input name="currentInvoice" type="number" min="0" step="0.01" defaultValue="0" required/></label>
        <label>Dia de fechamento<input name="closingDay" type="number" min="1" max="31" required/></label>
        <label>Dia de vencimento<input name="dueDay" type="number" min="1" max="31" required/></label>
        {error&&<div className="form-error span2">{error}</div>}
        <div className="modal-actions span2"><button type="button" className="btn secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn primary" disabled={busy}>{busy?"Salvando...":"Salvar cartão"}</button></div>
      </form>
    </div></div>}
  </>;
}
