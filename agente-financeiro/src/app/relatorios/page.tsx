import {dateRange, type DateRangeQuery, rangeBuckets} from "@/lib/date-range";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { totals, paidValue } from "@/lib/finance";
import { cashTotals } from "@/lib/cash-report";
import AppShell from "@/components/AppShell";
import PeriodPicker from "@/components/PeriodPicker";
export default async function Page({searchParams}:{searchParams:Promise<DateRangeQuery & {month?:string;mode?:string}>}) {
 const userId=await getSessionUserId(); if(!userId) redirect("/login");
 const user=await db.user.findUnique({where:{id:userId}}); if(!user) redirect("/login");
 const query=await searchParams, period=dateRange(query), mode=query.mode==="actual"?"actual":"planned";
 const [payments,receipts]=await Promise.all([
  db.payment.findMany({where:{userId,cancelledAt:null},include:{events:true}}),
  db.receipt.findMany({where:{userId,cancelledAt:null}})
 ]);
 const planned=totals(payments.filter(p=>p.dueDate>=period.start&&p.dueDate<period.end),receipts.filter(r=>r.expectedAt>=period.start&&r.expectedAt<period.end));
 const actual=cashTotals(payments,receipts,period.start,period.end);
 const data=rangeBuckets(period).map(b=>({...b,planned:totals(payments.filter(p=>p.dueDate>=b.start&&p.dueDate<b.end),receipts.filter(r=>r.expectedAt>=b.start&&r.expectedAt<b.end)),actual:cashTotals(payments,receipts,b.start,b.end)}));
 const current=mode==="actual"?actual:planned,max=Math.max(1,...data.flatMap(d=>[Math.abs(d[mode].income),Math.abs(d[mode].expenses)]));
 const unknown=payments.filter(p=>!p.events.length&&!p.paidAt&&paidValue(p)>0).length;
 const legacy=payments.some(p=>p.events.some(e=>e.kind==="LEGACY"));
 return <AppShell active="/relatorios" userName={user.name} rangeQuery={period.search}><main className="page">
  <div className="page-head"><div><span className="kicker">ANÁLISE</span><h1>Previsto × realizado</h1><p>Compare seu planejamento com os recebimentos e pagamentos registrados.</p></div></div>
  <PeriodPicker period={period} action="/relatorios" mode={mode}/>
  <nav className="tabs" aria-label="Visão do relatório">{[["planned","Previsto"],["actual","Realizado"]].map(([key,label])=><Link key={key} aria-current={mode===key?"page":undefined} className={`tab ${mode===key?"active":""}`} href={`/relatorios?${period.search}&mode=${key}`}>{label}</Link>)}</nav>
  <p className="period-note">{mode==="actual"?"Realizado usa a data efetiva de recebimento e de cada pagamento parcial. Estornos aparecem como saídas negativas na data em que foram registrados. Não representa saldo bancário.":"Previsto usa a data prevista da receita e o vencimento da despesa, incluindo os valores já concluídos."} Lançamentos cancelados ficam fora de ambas as visões.</p>
  {unknown>0&&<p role="status">{unknown} conta(s) antiga(s) com pagamento sem data ficam fora do realizado por período. Confira seus históricos.</p>}
  {legacy&&<p className="period-note">Há pagamentos antigos identificados como “Saldo pago anterior”: a data disponível pode representar o registro do saldo, sem detalhamento das parcelas originais.</p>}
  <div className="stats-grid">{[[mode==="actual"?"Recebido":"Receitas previstas",current.income],[mode==="actual"?"Pago líquido de estornos":"Despesas previstas",current.expenses],[mode==="actual"?"Saldo realizado no período":"Saldo previsto",current.projected]].map(([label,value])=><div className="stat-card" key={String(label)}><small>{label}</small><strong>{brl.format(Number(value))}</strong><span>{period.label}</span></div>)}</div>
  <section className="panel"><div className="panel-head"><h2>{mode==="actual"?"Movimentações realizadas":"Planejamento"} — período selecionado</h2></div>
   <div className="chart-legend"><span>Entradas: barra escura</span><span>Saídas: barra clara</span></div>
   <div className="bar-chart period-chart" role="img" aria-label="Comparativo mensal. Valores e sinais na tabela abaixo.">{data.map(d=><div className="bar-column" key={d.key}><div className="bar-stack"><div className="bar income" title={brl.format(d[mode].income)} style={{height:`${Math.abs(d[mode].income)/max*180}px`}}/><div className="bar expense" title={brl.format(d[mode].expenses)} style={{height:`${Math.abs(d[mode].expenses)/max*180}px`}}/></div><span>{d.label}</span></div>)}</div>
   <p className="period-note">As barras representam a magnitude; a tabela preserva os sinais, inclusive estornos.</p>
   <div className="table-wrap"><table className="mobile-records"><caption className="table-caption">Comparação dentro do período selecionado</caption><thead><tr><th>Intervalo</th><th>Receitas previstas / recebidas</th><th>Despesas previstas / pagas</th><th>Saldo previsto / realizado</th></tr></thead><tbody>{data.map(d=><tr key={d.key}><th scope="row">{d.label}</th><td data-label="Receitas previstas / recebidas">{brl.format(d.planned.income)} / {brl.format(d.actual.income)}</td><td data-label="Despesas previstas / pagas">{brl.format(d.planned.expenses)} / {brl.format(d.actual.expenses)}</td><td data-label="Saldo previsto / realizado">{brl.format(d.planned.projected)} / {brl.format(d.actual.projected)}</td></tr>)}</tbody></table></div>
  </section>
 <section className="panel"><div className="panel-head"><h2>Maiores despesas previstas de {period.label}</h2></div><div className="metric-list">{payments.filter(p=>p.dueDate>=period.start&&p.dueDate<period.end).sort((a,b)=>b.amount-a.amount).slice(0,5).map(p=><div key={p.id}><Link href={`/pagamentos?${period.search}#conta-${p.id}`}>{p.name}</Link><b>{brl.format(p.amount)}</b></div>)}</div><p className="period-note">{payments.filter(p=>p.dueDate>=period.start&&p.dueDate<period.end).length} conta(s) no período · restante previsto: {brl.format(planned.pending)}.</p></section>
 </main></AppShell>;
}
