import Link from "next/link";
import { MonthInput } from "./FormInputs";
export default function PeriodPicker({ month, action, status, mode }: { month: string; action: string; status?: string; mode?: string }) {
 const date = new Date(`${month}-01T12:00:00Z`);
 const url = (offset: number) => { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + offset); const q = new URLSearchParams({month: d.toISOString().slice(0,7)}); if(status) q.set("status",status); if(mode) q.set("mode",mode); return `${action}?${q}`; };
 return <form action={action} className="period-picker">
   {+month.slice(0,4)>1900 && <Link className="btn secondary" aria-label="Mês anterior" href={url(-1)}>←</Link>}
   <label>Período<MonthInput key={month} month={month}/></label>
   {+month.slice(0,4)<9998 && <Link className="btn secondary" aria-label="Próximo mês" href={url(1)}>→</Link>}
   {status && <input type="hidden" name="status" value={status}/>}{mode && <input type="hidden" name="mode" value={mode}/>}
   <button className="btn secondary">Aplicar</button>
 </form>;
}
