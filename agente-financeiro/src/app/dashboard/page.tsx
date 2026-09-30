import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, shortDate } from "@/lib/format";
import AppShell from "@/components/AppShell";
import PaymentForm from "@/components/PaymentForm";
import StatusBadge from "@/components/StatusBadge";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleDollarSign } from "lucide-react";

export default async function Dashboard(){
 const userId=await getSessionUserId(); if(!userId)redirect('/login');
 const user=await db.user.findUnique({where:{id:userId}}); if(!user)redirect('/login');
 const [payments,receipts]=await Promise.all([db.payment.findMany({where:{userId},orderBy:{dueDate:'asc'}}),db.receipt.findMany({where:{userId}})]);
 const totalPay=payments.reduce((s,p)=>s+p.amount,0), paid=payments.filter(p=>p.status==='PAID').reduce((s,p)=>s+(p.paidAmount||p.amount),0), pending=totalPay-paid, income=receipts.reduce((s,r)=>s+r.amount,0), balance=income-pending;
 return <AppShell active="/dashboard" userName={user.name}><main className="page"><div className="page-head"><div><span className="kicker">VISÃO GERAL</span><h1>Olá, {user.name.split(' ')[0]} 👋</h1><p>Acompanhe seu mês e veja o que precisa da sua atenção.</p></div><PaymentForm/></div>
 <div className="stats-grid"><div className="stat-card"><div className="stat-icon"><CircleDollarSign/></div><small>Saldo previsto</small><strong>{brl.format(balance)}</strong><span className={balance>=0?'positive':'negative'}>{balance>=0?<ArrowUpRight/>:<ArrowDownRight/>}{income?Math.abs(balance/income*100).toFixed(0):0}% da receita</span></div><div className="stat-card"><div className="stat-icon"><CalendarClock/></div><small>A pagar</small><strong>{brl.format(pending)}</strong><span>{payments.filter(p=>p.status!=='PAID').length} contas pendentes</span></div><div className="stat-card"><div className="stat-icon"><ArrowUpRight/></div><small>Pago</small><strong>{brl.format(paid)}</strong><span>{payments.filter(p=>p.status==='PAID').length} contas concluídas</span></div><div className="stat-card"><div className="stat-icon"><ArrowDownRight/></div><small>Receitas</small><strong>{brl.format(income)}</strong><span>{receipts.length} entradas cadastradas</span></div></div>
 <section className="panel"><div className="panel-head"><div><h2>Próximos pagamentos</h2><p>Ordenados pela data de vencimento.</p></div><a href="/pagamentos" className="text-link">Ver todos</a></div>{payments.length===0?<div className="empty">Nenhuma conta cadastrada ainda.</div>:<div className="table-wrap"><table><thead><tr><th>Conta</th><th>Vencimento</th><th>Prioridade</th><th>Valor</th><th>Status</th></tr></thead><tbody>{payments.slice(0,6).map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.category}</small></td><td>{shortDate.format(p.dueDate)}</td><td><span className={`priority ${p.priority.toLowerCase()}`}>{({ESSENTIAL:'Essencial',HIGH:'Alta',MEDIUM:'Média',LOW:'Baixa'} as Record<string,string>)[p.priority]}</span></td><td><b>{brl.format(p.amount)}</b></td><td><StatusBadge status={p.status}/></td></tr>)}</tbody></table></div>}</section>
 </main></AppShell>
}
