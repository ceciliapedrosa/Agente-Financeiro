import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <div className="brand"><span className="brand-mark">AF</span><span>Agente Financeiro</span></div>
        <div className="nav-actions"><Link href="/login" className="btn ghost">Entrar</Link><Link href="/cadastro" className="btn primary">Criar conta</Link></div>
      </nav>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> Seu dinheiro, organizado por prioridade</div>
        <h1>Saiba exatamente <span>o que pagar</span>, quando pagar e quanto sobra.</h1>
        <p>Centralize contas, vencimentos, receitas e prioridades em um único lugar. Acompanhe o mês em tempo real e tome decisões com clareza.</p>
        <div className="hero-actions"><Link href="/cadastro" className="btn primary big">Começar agora <ArrowRight size={18}/></Link><Link href="/login" className="btn secondary big">Já tenho uma conta</Link></div>
        <div className="trust-row"><span><CheckCircle2 size={16}/> Controle mensal</span><span><CheckCircle2 size={16}/> Status automáticos</span><span><ShieldCheck size={16}/> Dados por usuário</span></div>
      </section>
      <section className="preview-shell">
        <div className="preview-top"><span></span><span></span><span></span></div>
        <div className="preview-grid">
          <aside className="preview-side"><div className="mini-brand">AF</div>{["Visão geral","Pagamentos","Receitas","Cartões","Relatórios"].map((x,i)=><div key={x} className={i===0?"preview-item active":"preview-item"}>{x}</div>)}</aside>
          <div className="preview-main">
            <div className="preview-heading"><div><small>SETEMBRO 2026</small><h3>Olá, Cecília 👋</h3></div><div className="fake-button">+ Nova conta</div></div>
            <div className="stats-row"><div className="fake-stat"><small>SALDO PREVISTO</small><strong>R$ 2.640,00</strong><em>+12% este mês</em></div><div className="fake-stat"><small>A PAGAR</small><strong>R$ 1.840,00</strong><em>6 contas</em></div><div className="fake-stat"><small>PAGO</small><strong>R$ 2.100,00</strong><em>8 contas</em></div></div>
            <div className="fake-table"><div className="fake-table-title">Próximos pagamentos</div>{[["Aluguel","28 SET","R$ 1.200","Essencial"],["Energia","29 SET","R$ 235","Essencial"],["Cartão","02 OUT","R$ 780","Alta"]].map(r=><div className="fake-row" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span><i>{r[3]}</i></div>)}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
