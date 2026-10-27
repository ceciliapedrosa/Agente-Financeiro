import { Prisma } from "@prisma/client";
import { z } from "zod";
import { calendarDate } from "./recurrence";
import { todayISO } from "./finance";
const day=z.string().refine(s=>{try{calendarDate(s);return s>="1900-01-01"&&s<="9998-12-31";}catch{return false;}},"Data inválida");
export const importSchema=z.object({batchId:z.string().uuid(),rows:z.array(z.object({kind:z.enum(["PAYMENT","RECEIPT"]),name:z.string().trim().min(1).max(200),amount:z.number().finite().positive().max(999999999).refine(n=>Math.abs(n*100-Math.round(n*100))<0.00001),date:day,category:z.string().trim().min(1).max(100),done:z.boolean(),actualDate:z.string().optional()}).superRefine((r,ctx)=>{if(r.done&&(!day.safeParse(r.actualDate).success||r.actualDate!>todayISO()))ctx.addIssue({code:"custom",message:"Informe a data efetiva até hoje."});})).min(1).max(200)});
export async function importRecords(tx:Prisma.TransactionClient,userId:string,input:unknown){
 const data=importSchema.parse(input);await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
 const batchKey=`import:${userId}:${data.batchId}`;
 const previous=await tx.recordHistory.findUnique({where:{id:batchKey}});
 if(previous)return previous.after as {created:number;skipped:number};
 let created=0,skipped=0;
 for(const row of data.rows){const date=calendarDate(row.date); const from=new Date(`${row.date}T00:00:00Z`),to=new Date(from);to.setUTCDate(to.getUTCDate()+1);const common={userId,name:row.name,amount:row.amount};
  const duplicate=row.kind==="PAYMENT"?await tx.payment.findFirst({where:{...common,dueDate:{gte:from,lt:to}}}):await tx.receipt.findFirst({where:{...common,expectedAt:{gte:from,lt:to}}});
  if(duplicate){skipped++;continue;}
  const actual=row.done?calendarDate(row.actualDate!):null;
  const record=row.kind==="PAYMENT"?await tx.payment.create({data:{...common,category:row.category,dueDate:date,status:row.done?"PAID":"PENDING",paidAmount:row.done?row.amount:0,paidAt:actual,...(actual?{events:{create:{amount:row.amount,paidAt:actual,kind:"PAYMENT"}}}:{})}}):await tx.receipt.create({data:{...common,category:row.category,expectedAt:date,receivedAt:actual}});
  await tx.recordHistory.create({data:{userId,kind:row.kind,recordId:record.id,action:"import",before:{},after:JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue}});created++;
 }
 const result={created,skipped};await tx.recordHistory.create({data:{id:batchKey,userId,kind:"IMPORT",recordId:batchKey,action:"import",before:{},after:result}});return result;
}
