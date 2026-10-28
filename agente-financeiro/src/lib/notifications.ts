import {createHash} from "node:crypto";
import webpush from "web-push";
import {db} from "@/lib/db";
import {allowedPushEndpoint} from "@/lib/notification-rules";
export const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export function notificationConfig(){
 const base=process.env.APP_URL;let origin="";try{const u=new URL(base||"");if(u.protocol==="https:")origin=u.origin;}catch{}
 const scheduler=Boolean(process.env.CRON_SECRET&&process.env.CRON_SECRET.length>=32&&process.env.SESSION_SECRET&&process.env.SESSION_SECRET.length>=32);
 return {origin,push:Boolean(scheduler&&origin&&process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT),email:Boolean(scheduler&&origin&&process.env.RESEND_API_KEY&&process.env.EMAIL_FROM)};
}
export async function sendEmail(to:string,subject:string,text:string,key:string){
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error("Email provider unavailable");
}
// An atomic claim prevents concurrent/repeated cron invocations from sending duplicates.
// Ambiguous delivery failures are NOT retried the same day (push has no idempotency API).
export async function deliverOnce(userId:string,channel:string,target:string,day:string,send:()=>Promise<void>){
 const id=hash(`${userId}|${channel}|${target}|${day}`);
 const claim=await db.notificationDelivery.createMany({data:[{id,userId,channel}],skipDuplicates:true});if(!claim.count)return false;
 try{await send();await db.notificationDelivery.update({where:{id},data:{status:"SENT"}});}catch{await db.notificationDelivery.update({where:{id},data:{status:"FAILED"}});}
 return true;
}
export async function sendPush(s:{id:string;endpoint:string;p256dh:string;auth:string},day:string){
 if(!allowedPushEndpoint(s.endpoint))throw new Error("Invalid push endpoint");
 try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:"DIZI · Lembrete financeiro",body:"Você tem pendências para conferir. Abra o DIZI para ver os detalhes.",tag:`dizi-${day}`}),{TTL:3600,timeout:12000,vapidDetails:{subject:process.env.VAPID_SUBJECT!,publicKey:process.env.VAPID_PUBLIC_KEY!,privateKey:process.env.VAPID_PRIVATE_KEY!}});}catch(e){if(e&&typeof e==="object"&&"statusCode" in e&&[404,410].includes(Number(e.statusCode)))await db.pushSubscription.deleteMany({where:{id:s.id}});throw e;}
}
