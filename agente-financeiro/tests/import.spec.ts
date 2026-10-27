import {expect,it,vi} from "vitest";
import type {Prisma} from "@prisma/client";
import {parseSheet,readDelimited} from "../src/lib/import-sheet";
import {importRecords,importSchema} from "../src/lib/import-records";
it("reads Brazilian CSV, quoted separators and actual receipt dates",()=>{
 const rows=parseSheet('Tipo;Descrição;Valor;Data;Status;Data efetiva\nReceita;"Extra; cliente";"1.600,00";10/10/2026;Recebida;11/10/2026',"2026-10");
 expect(rows[0]).toMatchObject({kind:"RECEIPT",name:"Extra; cliente",amount:"1.600,00",date:"2026-10-10",done:true,actualDate:"2026-10-11"});
});
it("ignores totals in a pasted irregular sheet and preserves two separate Renner expenses",()=>{
 const rows=parseSheet('RENDA\tR$ 1.600,00\tRENDA DAVI\tR$ 1.099,00\tRENDA TOTAL\tR$ 6.399,00\nDETALHAMENTOS\nCONTAS\tDAVI\nRENNER\tR$ 69,61\tDIA 06\tPENDENTE\tR$ 0,00\nRENNER\tR$ 58,93\tDIA 19\tPENDENTE\tR$ 0,00',"2026-10");
 expect(rows).toHaveLength(4);expect(rows.slice(2).map(r=>r.date)).toEqual(["2026-10-06","2026-10-19"]);
 expect(rows.some(r=>r.name.includes("TOTAL"))).toBe(false);
});
it("leaves missing values and dates for review instead of making them zero",()=>{
 expect(parseSheet('Descrição;Valor;Data\nInternet;;',"2026-10")[0]).toMatchObject({amount:"",date:""});
 expect(()=>readDelimited('Nome;"sem fechamento')).toThrow();
});
const row={kind:"PAYMENT",name:"Internet",amount:79,date:"2026-10-10",category:"Casa",done:true,actualDate:"2026-10-10"};
const input={batchId:"2f444a4f-c001-4c13-9222-7661b11dc411",rows:[row]};
it("rejects missing actual dates, impossible dates, negative amounts and oversized batches",()=>{
 for(const patch of [{actualDate:""},{date:"2026-02-31"},{amount:-10},{actualDate:"9998-01-01"}])expect(importSchema.safeParse({...input,rows:[{...row,...patch}]}).success).toBe(false);
 expect(importSchema.safeParse({...input,rows:Array(201).fill(row)}).success).toBe(false);
});
function setup(){return {$executeRaw:vi.fn(),recordHistory:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},payment:{findFirst:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue({id:"p1"})},receipt:{findFirst:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue({id:"r1"})}};}
it("imports a paid expense with an event and ownership, and audits the batch",async()=>{
 const tx=setup();expect(await importRecords(tx as unknown as Prisma.TransactionClient,"owner",input)).toEqual({created:1,skipped:0});
 expect(tx.payment.create.mock.calls[0][0].data).toMatchObject({userId:"owner",amount:79,status:"PAID",paidAmount:79,events:{create:{amount:79,kind:"PAYMENT"}}});
 expect(tx.recordHistory.create).toHaveBeenCalledTimes(2);
});
it("does not create duplicates or repeat a completed batch",async()=>{
 const tx=setup();tx.payment.findFirst.mockResolvedValue({id:"old"});expect(await importRecords(tx as unknown as Prisma.TransactionClient,"owner",input)).toEqual({created:0,skipped:1});
 expect(tx.payment.findFirst.mock.calls[0][0].where).toMatchObject({userId:"owner",name:"Internet",amount:79});expect(tx.payment.create).not.toHaveBeenCalled();
 tx.recordHistory.findUnique.mockResolvedValue({after:{created:1,skipped:0}});expect(await importRecords(tx as unknown as Prisma.TransactionClient,"owner",input)).toEqual({created:1,skipped:0});expect(tx.payment.create).not.toHaveBeenCalled();
});
