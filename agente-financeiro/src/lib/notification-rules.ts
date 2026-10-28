import {remaining, todayISO, type FinancialPayment} from "@/lib/finance";
export const defaultPreferences = {upcoming:true,dueToday:true,overdue:true,receipts:false};
export type Preferences = typeof defaultPreferences;
export function notificationWindow(now=new Date()) {
 const day=todayISO(now), end=new Date(`${day}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+4);return {day,end};
}
export function reminderCounts(payments:(FinancialPayment & {dueDate:Date;cancelledAt:Date|null})[],receipts:{expectedAt:Date;receivedAt:Date|null;cancelledAt:Date|null}[],prefs:Preferences,now=new Date()) {
 const {day,end}=notificationWindow(now);const counts={upcoming:0,dueToday:0,overdue:0,receipts:0};
 for(const p of payments){if(p.cancelledAt||remaining(p)<=0)continue;const date=p.dueDate.toISOString().slice(0,10);if(date<day&&prefs.overdue)counts.overdue++;else if(date===day&&prefs.dueToday)counts.dueToday++;else if(date>day&&p.dueDate<end&&prefs.upcoming)counts.upcoming++;}
 if(prefs.receipts)counts.receipts=receipts.filter(r=>!r.cancelledAt&&!r.receivedAt&&r.expectedAt.toISOString().slice(0,10)<=day).length;
 return counts;
}
export function reminderText(c:ReturnType<typeof reminderCounts>){return [c.dueToday&&`${c.dueToday} pagamento(s) vencem hoje`,c.upcoming&&`${c.upcoming} pagamento(s) vencem nos próximos 3 dias`,c.overdue&&`${c.overdue} pagamento(s) em atraso`,c.receipts&&`${c.receipts} receita(s) prevista(s) para hoje ou atrasada(s)`].filter(Boolean).join(". ");}
export function allowedPushEndpoint(value:string){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&!u.hash&&(u.hostname==="fcm.googleapis.com"||u.hostname==="web.push.apple.com"||u.hostname==="updates.push.services.mozilla.com"||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname));}catch{return false;}}
