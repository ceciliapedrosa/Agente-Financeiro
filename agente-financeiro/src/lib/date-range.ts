import { monthPeriod } from "./finance";
export type DateRangeQuery = {start?:string;end?:string;all?:string;month?:string};
export function validCalendarDate(s:string) {
 if(!/^(19\d{2}|[2-9]\d{3})-\d{2}-\d{2}$/.test(s)||s>"9998-12-31") return false;
 const d=new Date(s+"T00:00:00Z"); return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;
}
const label=(s:string)=>s.split("-").reverse().join("/");
export function dateRange(q:DateRangeQuery,allowAll=false) {
 const m=monthPeriod(q.month); let from=m.start.toISOString().slice(0,10),to=new Date(+m.end-86400000).toISOString().slice(0,10),error:string|undefined;
 const all=allowAll&&(q.all==="1"||q.month==="all");
 if(!all&&(q.start!==undefined||q.end!==undefined)) {
  if(!validCalendarDate(q.start??"")||!validCalendarDate(q.end??"")||q.start!>q.end!) error="Informe datas válidas, com a data final igual ou posterior à inicial. Exibindo o mês de referência enquanto você corrige o intervalo.";
  else {from=q.start!;to=q.end!;}
 }
 const start=new Date(from+"T00:00:00Z"),end=new Date(to+"T00:00:00Z");end.setUTCDate(end.getUTCDate()+1);
 return {from,to,start,end,key:from.slice(0,7),all,error,label:all?"todos os períodos":`${label(from)} a ${label(to)}`,search:all?"all=1":new URLSearchParams({start:from,end:to}).toString()};
}
export type DateRange=ReturnType<typeof dateRange>;
export function rangeBuckets(r:DateRange) {
 const last=new Date(r.to+"T00:00:00Z"),count=(last.getUTCFullYear()-r.start.getUTCFullYear())*12+last.getUTCMonth()-r.start.getUTCMonth()+1,step=Math.max(1,Math.ceil(count/12));
 const result:{key:string;label:string;start:Date;end:Date}[]=[];let cursor=new Date(r.start);
 while(cursor<r.end) {const next=new Date(cursor);next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+step);if(next>r.end)next.setTime(+r.end);const a=cursor.toISOString().slice(0,10),b=new Date(+next-86400000).toISOString().slice(0,10);result.push({key:a,label:`${label(a)} a ${label(b)}`,start:new Date(cursor),end:next});cursor=next;}
 return result;
}
