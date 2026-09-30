"use client";
import { useRouter } from "next/navigation";
export default function PaymentAction({id,status}:{id:string;status:string}){const router=useRouter(); async function mark(){await fetch('/api/payments',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:status==='PAID'?'PENDING':'PAID'})});router.refresh();} return <button className={status==='PAID'?"small-action muted":"small-action"} onClick={mark}>{status==='PAID'?'Reabrir':'Marcar como pago'}</button>}
