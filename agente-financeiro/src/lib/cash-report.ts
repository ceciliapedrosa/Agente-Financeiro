import { cents, paidValue, type FinancialPayment } from "./finance";
type Payment = FinancialPayment & { paidAt: Date | null; events: { amount: number; paidAt: Date; kind: string }[] };
export function cashTotals(payments: Payment[], receipts: { amount: number; receivedAt: Date | null }[], start: Date, end: Date) {
 const within = (date: Date | null) => date !== null && date >= start && date < end;
 let expenses = 0;
 for (const p of payments) {
  if(p.events.length) { for(const e of p.events) if(within(e.paidAt)) expenses += cents(e.amount); }
  else if(within(p.paidAt)) expenses += cents(paidValue(p));
 }
 const income = receipts.reduce((sum,r)=>sum+(within(r.receivedAt)?cents(r.amount):0),0);
 return { income: income/100, expenses: expenses/100, projected:(income-expenses)/100 };
}
