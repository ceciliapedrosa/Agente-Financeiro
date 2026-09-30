import Link from "next/link";
import { LayoutDashboard, ReceiptText, TrendingUp, CreditCard, BarChart3, LogOut } from "lucide-react";

const nav = [
  ["/dashboard","Visão geral",LayoutDashboard],
  ["/pagamentos","Pagamentos",ReceiptText],
  ["/receitas","Receitas",TrendingUp],
  ["/cartoes","Cartões",CreditCard],
  ["/relatorios","Relatórios",BarChart3],
] as const;

export default function AppShell({ children, active, userName }: { children: React.ReactNode; active: string; userName: string }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand side-brand"><span className="brand-mark">D</span><span>DIZI</span></div>
      <nav className="side-nav">{nav.map(([href,label,Icon])=><Link key={href} href={href} className={active===href?"side-link active":"side-link"}><Icon size={19}/><span>{label}</span></Link>)}</nav>
      <div className="side-bottom"><div className="user-chip"><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><div><b>{userName}</b><small>Conta pessoal</small></div></div><form action="/api/auth/logout" method="post"><button className="icon-btn" title="Sair"><LogOut size={18}/></button></form></div>
    </aside>
    <div className="content"><header className="mobile-header"><span className="brand-mark">D</span><b>DIZI</b></header>{children}</div>
  </div>
}
