"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReceiptAction({id,received}:{id:string;received:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  if(received) return <span className="status paid">Recebida</span>;
  async function mark(){
    setBusy(true);
    await fetch("/api/receipts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,received:true})});
    setBusy(false); router.refresh();
  }
  return <button className="small-action" onClick={mark} disabled={busy}>{busy?"Salvando...":"Marcar recebida"}</button>;
}
