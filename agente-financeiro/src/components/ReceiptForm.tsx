"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function ReceiptForm(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    const fd=new FormData(e.currentTarget);
    const payload=Object.fromEntries(fd.entries());
    payload.recurring=fd.get("recurring")==="on" ? "true" : "";
    const res=await fetch("/api/receipts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({})); setBusy(false);
    if(!res.ok){setError(data.error||"Não foi possível salvar a receita.");return;}
    setOpen(false); router.refresh();
  }
  return <>
    <button className="btn primary" onClick={()=>setOpen(true)}><Plus size={17}/> Nova receita</button>
    {open&&<div className="modal-wrap"><div className="modal-card">
      <div className="modal-head"><div><h2>Nova receita</h2><p>Cadastre uma entrada prevista ou já recebida.</p></div><button className="icon-btn" onClick={()=>setOpen(false)}><X/></button></div>
      <form className="grid-form" onSubmit={submit}>
        <label className="span2">Descrição<input name="name" placeholder="Ex.: Salário" required/></label>
        <label>Valor<input name="amount" type="number" step="0.01" min="0.01" required/></label>
        <label>Data prevista<input name="expectedAt" type="date" required/></label>
        <label>Categoria<select name="category"><option>Salário</option><option>Freelance</option><option>Vendas</option><option>Investimentos</option><option>Reembolso</option><option>Outros</option></select></label>
        <label>Status<select name="status"><option value="PENDING">Prevista</option><option value="RECEIVED">Recebida</option></select></label>
        <label className="check-row span2"><input name="recurring" type="checkbox"/> Receita recorrente</label>
        {error&&<div className="form-error span2">{error}</div>}
        <div className="modal-actions span2"><button type="button" className="btn secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn primary" disabled={busy}>{busy?"Salvando...":"Salvar receita"}</button></div>
      </form>
    </div></div>}
  </>;
}
