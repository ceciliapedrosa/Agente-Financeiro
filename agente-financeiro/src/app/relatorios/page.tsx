import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import { brl } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, PiggyBank, Scale } from "lucide-react";

const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function Page(){
  const userId=await getSessionUserId(); if(!userId)redirect("/login");
  const user=await db.user.findUnique({where:{id:userId}}); if(!user)redirect("/login");
  const [payments,receipts]=await Promise.all([
    db.payment.findMany({where:{userId}}),
    db.receipt.findMany({where:{userId}})
  ]);

  const totalIncome=receipts.reduce((s,r)=>s+r.amount,0);
  const totalExpenses=payments.reduce((s,p)=>s+p.amount,0);
  const paid=payments.filter(p=>p.status==="PAID").reduce((s,p)=>s+(p.paidAmount||p.amount),0);
  const balance=totalIncome-totalExpenses;

  const now=new Date();
  const data=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const y=d.getFullYear(),m=d.getMonth();
    const income=receipts.filter(r=>r.expectedAt.getFullYear()===y&&r.expectedAt.getMonth()===m).reduce((s,r)=>s+r.amount,0);
    const expense=payments.filter(p=>p.dueDate.getFullYear()===y&&p.dueDate.getMonth()===m).reduce((s,p)=>s+p.amount,0);
    return {label:months[m],income,expense};
  });
  const max=Math.max(1,...data.flatMap(d=>[d.income,d.expense]));

  return <AppShell active="/relatorios" userName={user.name}><main className="page">
    <div className="page-head"><div><span className="kicker">ANÁLISE</span><h1>Relatórios</h1><p>Visão consolidada da sua movimentação financeira.</p></div></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-icon"><ArrowDownToLine/></div><small>Receitas</small><strong>{brl.format(totalIncome)}</strong><span>total cadastrado</span></div>
      <div className="stat-card"><div className="stat-icon"><ArrowUpFromLine/></div><small>Despesas</small><strong>{brl.format(totalExpenses)}</strong><span>total cadastrado</span></div>
      <div className="stat-card"><div className="stat-icon"><PiggyBank/></div><small>Saldo</small><strong>{brl.format(balance)}</strong><span>receitas menos despesas</span></div>
      <div className="stat-card"><div className="stat-icon"><Scale/></div><small>Pago</small><strong>{brl.format(paid)}</strong><span>despesas concluídas</span></div>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Fluxo dos últimos 6 meses</h2><p>Comparativo entre entradas e despesas cadastradas.</p></div></div>
      <div className="chart-legend"><span><i className="legend-income"/> Receitas</span><span><i className="legend-expense"/> Despesas</span></div>
      <div className="bar-chart">{data.map(d=><div className="bar-column" key={d.label}><div className="bar-stack"><div className="bar income" title={brl.format(d.income)} style={{height:String(Math.max(2,d.income/max*180))+"px"}}/><div className="bar expense" title={brl.format(d.expense)} style={{height:String(Math.max(2,d.expense/max*180))+"px"}}/></div><span>{d.label}</span></div>)}</div>
    </section>
    <div className="report-grid">
      <section className="panel"><div className="panel-head"><div><h2>Resumo</h2><p>Indicadores gerais.</p></div></div><div className="metric-list"><div><span>Quantidade de pagamentos</span><b>{payments.length}</b></div><div><span>Quantidade de receitas</span><b>{receipts.length}</b></div><div><span>Contas pendentes</span><b>{payments.filter(p=>p.status!=="PAID").length}</b></div><div><span>Taxa de pagamento</span><b>{payments.length?Math.round(payments.filter(p=>p.status==="PAID").length/payments.length*100):0}%</b></div></div></section>
      <section className="panel"><div className="panel-head"><div><h2>Maiores despesas</h2><p>Top 5 contas por valor.</p></div></div><div className="metric-list">{payments.sort((a,b)=>b.amount-a.amount).slice(0,5).map(p=><div key={p.id}><span>{p.name}</span><b>{brl.format(p.amount)}</b></div>)}{payments.length===0&&<div className="empty">Sem despesas cadastradas.</div>}</div></section>
    </div>
  </main></AppShell>;
}
