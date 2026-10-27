import { expect,it } from "vitest";
import { cashTotals } from "../src/lib/cash-report";
const start=new Date("2026-10-01"),end=new Date("2026-11-01");
it("uses payment events rather than due dates and nets reversals in their own month",()=>{
 const p={amount:200,status:"PARTIAL",paidAmount:60,paidAt:new Date("2026-10-10"),events:[{amount:100,paidAt:new Date("2026-09-10"),kind:"PAYMENT"},{amount:20,paidAt:new Date("2026-10-01"),kind:"PAYMENT"},{amount:-60,paidAt:new Date("2026-10-10"),kind:"REVERSAL"}]};
 expect(cashTotals([p],[{amount:1000,receivedAt:new Date("2026-10-05")},{amount:500,receivedAt:null}],start,end)).toEqual({income:1000,expenses:-40,projected:1040});
});
it("uses dated legacy payments once, omits undated ones and excludes the upper boundary",()=>{
 const p={amount:100,status:"PAID",paidAmount:null,events:[]};
 expect(cashTotals([{...p,paidAt:start},{...p,paidAt:null},{...p,paidAt:end}],[],start,end).expenses).toBe(100);
});
