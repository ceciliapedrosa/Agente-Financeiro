import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ReceiptForm from "@/components/ReceiptForm";
import ReceiptAction from "@/components/ReceiptAction";
import { brl } from "@/lib/format";
import { ArrowDownToLine, CalendarDays, Repeat2, Wallet } from "lucide-react";

export default async function Page(){
  const userId=await getSessionUserId(); if(!userId)redirect("/login");
  const user=await db.user.findUnique({where:{id:userId}}); if(!user)redirect("/login");
  const rs=await db.receipt.findMany({where:{userId},orderBy:{expectedAt:"desc"}});
  const total=rs.reduce((s,r)=>s+r.amount,0);
  const received=rs.filter(r=>r.receivedAt).reduce((s,r)=>s+r.amount,0);
  const pending=total-received;
  const recurring=rs.filter(r=>r.recurring).length;

  return <AppShell active="/receitas" userName={user.name}><main className="page">
    <div className="page-head"><div><span className="kicker">ENTRADAS</span><h1>Receitas</h1><p>Salários, rendas extras e outros recebimentos em um só lugar.</p></div><ReceiptForm/></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-icon"><Wallet/></div><small>Total previsto</small><strong>{brl.format(total)}</strong><span>{rs.length} receitas cadastradas</span></div>
      <div className="stat-card"><div className="stat-icon"><ArrowDownToLine/></div><small>Recebido</small><strong>{brl.format(received)}</strong><span>{rs.filter(r=>r.receivedAt).length} recebidas</span></div>
      <div className="stat-card"><div className="stat-icon"><CalendarDays/></div><small>A receber</small><strong>{brl.format(pending)}</strong><span>{rs.filter(r=>!r.receivedAt).length} pendentes</span></div>
      <div className="stat-card"><div className="stat-icon"><Repeat2/></div><small>Recorrentes</small><strong>{recurring}</strong><span>lançamentos recorrentes</span></div>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Entradas</h2><p>Histórico e previsão das suas receitas.</p></div></div>
      {rs.length===0?<div className="empty">Nenhuma receita cadastrada. Use “Nova receita” para começar.</div>:<div className="table-wrap"><table><thead><tr><th>Receita</th><th>Data</th><th>Valor</th><th>Recorrência</th><th>Status</th></tr></thead><tbody>
        {rs.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.category}</small></td><td>{new Intl.DateTimeFormat("pt-BR").format(r.expectedAt)}</td><td><b>{brl.format(r.amount)}</b></td><td>{r.recurring?"Recorrente":"Única"}</td><td><ReceiptAction id={r.id} received={!!r.receivedAt}/></td></tr>)}
      </tbody></table></div>}
    </section>
  </main></AppShell>;
}
