import {redirect} from "next/navigation";
import {getSessionUserId} from "@/lib/auth";
import {db} from "@/lib/db";
import {bankAccess,snapshotSchema} from "@/lib/pluggy";
import {dateRange,type DateRangeQuery} from "@/lib/date-range";
import AppShell from "@/components/AppShell";
import PeriodPicker from "@/components/PeriodPicker";
import BankConnect from "@/components/BankConnect";
const money=(n:number,currency:string)=>{try{return new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(n);}catch{return `${n.toFixed(2)} ${currency}`;}};
const date=(s:string)=>{const d=new Date(s);return Number.isFinite(+d)?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeZone:"UTC"}).format(d):"Não informada";};
export default async function Page({searchParams}:{searchParams:Promise<DateRangeQuery>}){
 const userId=await getSessionUserId();if(!userId)redirect("/login");const user=await db.user.findUnique({where:{id:userId}});if(!user)redirect("/login");
 const enabled=bankAccess(userId),period=dateRange(await searchParams);
 const connections=enabled?await db.bankConnection.findMany({where:{userId,itemId:{not:null}},orderBy:{createdAt:"desc"}}):[];
 return <AppShell active="/bancos" userName={user.name} rangeQuery={period.search}><main className="page">
 <div className="page-head"><div><span className="kicker">CONEXÕES</span><h1>Contas conectadas</h1><p>Consulte saldos e extratos dos bancos conectados.</p></div></div>
 <section className="panel bank-panel"><h2>{enabled?"Piloto com bancos fictícios":"Conexão bancária em preparação"}</h2><p>{enabled?"Use somente as credenciais fictícias do sandbox Pluggy. Este piloto está restrito às contas de teste autorizadas.":"Estamos preparando a integração. Conexões com bancos reais ainda não estão disponíveis."}</p><p>Os dados desta etapa ficam separados das receitas, despesas e relatórios do DIZI. Nenhum pagamento ou transferência é realizado.</p><BankConnect enabled={enabled}/>{enabled&&<details><summary>Como testar</summary><p>No banco fictício Pluggy Bank, use usuário <code>user-ok</code>, senha <code>password-ok</code> e, se solicitado, código <code>123456</code>. São dados de demonstração fornecidos pela Pluggy.</p></details>}</section>
 {enabled&&<><PeriodPicker period={period} action="/bancos"/><p className="period-note">O período filtra o extrato. O saldo é o último informado pelo provedor e não representa um saldo histórico do período.</p>{!connections.length&&<section className="panel bank-panel"><h2>Nenhuma conexão de teste</h2><p>Conecte um banco fictício para começar. Os testes não alteram seu financeiro.</p></section>}</>}
 {connections.map(c=>{const parsed=snapshotSchema.safeParse(c.snapshot),data=parsed.success?parsed.data:null;return <section className="panel bank-panel" key={c.id}><h2>{data?.bank??"Banco de teste conectado"}</h2><p>{data?`Situação informada pelo provedor: ${data.status}`:"Conexão salva. Consulte os dados para carregar o saldo e o extrato."}</p>{c.lastCheckedAt&&<p>Consulta no DIZI: {c.lastCheckedAt.toLocaleString("pt-BR",{timeZone:"America/Fortaleza"})}. Atualização no provedor: {data?.lastUpdatedAt?date(data.lastUpdatedAt):"não informada"}.</p>}<BankConnect enabled={enabled} id={c.id}/>
 {data?.accounts.map(a=>{const transactions=data.transactions.filter(t=>t.accountId===a.id&&new Date(t.date)>=period.start&&new Date(t.date)<period.end).sort((x,y)=>y.date.localeCompare(x.date));return <details key={a.id} className="bank-account"><summary>{a.name} {a.number} · {a.balance===null?"Saldo não informado":money(a.balance,a.currencyCode)}</summary><p>{transactions.length} movimentação(ões) no período.</p><div className="table-wrap"><table className="mobile-records"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td data-label="Data">{date(t.date)}</td><td data-label="Descrição">{t.description}</td><td data-label="Valor">{money(t.amount,t.currencyCode)}</td><td data-label="Situação">{t.status==="POSTED"?"Confirmada":t.status==="PENDING"?"Pendente":t.status}</td></tr>)}</tbody></table></div></details>;})}
 {data&&!data.accounts.length&&<p>Nenhuma conta bancária foi disponibilizada neste teste. O provedor pode ainda estar processando a conexão.</p>}</section>;})}
 </main></AppShell>;
}
