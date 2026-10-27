import DateRangeFields from "./DateRangeFields";
import type {DateRange} from "@/lib/date-range";
export default function PeriodPicker({period,action,status,mode,archived}:{period:DateRange;action:string;status?:string;mode?:string;archived?:string}) {
 return <><form action={action} className="period-picker range-picker"><DateRangeFields key={period.search} from={period.from} to={period.to} all={period.all}/>{status&&<input type="hidden" name="status" value={status}/>}{mode&&<input type="hidden" name="mode" value={mode}/>}{archived&&<input type="hidden" name="archived" value={archived}/>}<button className="btn secondary">Aplicar período</button></form>{period.error&&<p role="alert">{period.error}</p>}<p className="period-note">Período aplicado: {period.label}.</p></>;
}
