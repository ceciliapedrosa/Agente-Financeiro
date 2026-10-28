import {timingSafeEqual} from "node:crypto";
import {db} from "@/lib/db";
import {notificationWindow,reminderCounts,reminderText} from "@/lib/notification-rules";
import {deliverOnce,hash,notificationConfig,sendEmail,sendPush} from "@/lib/notifications";
export const runtime="nodejs";
export const maxDuration=300;
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const expected=`Bearer ${process.env.CRON_SECRET||""}`,actual=req.headers.get("authorization")||"";
 if(!process.env.CRON_SECRET||process.env.CRON_SECRET.length<32||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return new Response("Unauthorized",{status:401});
 const config=notificationConfig();if(!config.push&&!config.email)return Response.json({error:"Channels not configured"},{status:503});
 const now=new Date(),{day,end}=notificationWindow(now),deadline=Date.now()+240000;let cursor:string|undefined,attempts=0;
 try{
 while(Date.now()<deadline){
 const prefs=await db.notificationPreference.findMany({take:25,orderBy:{userId:"asc"},...(cursor?{cursor:{userId:cursor},skip:1}:{}),include:{user:{select:{email:true,pushSubscriptions:true}}}});
 if(!prefs.length){await db.notificationDelivery.deleteMany({where:{createdAt:{lt:new Date(+now-90*86400000)}}});return Response.json({ok:true,attempts});}
 for(const p of prefs){
 if(Date.now()>deadline)return Response.json({error:"Time budget exceeded; rerun safely",attempts},{status:503});
 const email=config.email&&p.emailEnabled&&p.emailVerified===p.user.email,subs=config.push?p.user.pushSubscriptions:[];if(!email&&!subs.length)continue;
 const [payments,receipts]=await Promise.all([db.payment.findMany({where:{userId:p.userId,cancelledAt:null,status:{not:"PAID"},dueDate:{lt:end}},select:{amount:true,paidAmount:true,status:true,dueDate:true,cancelledAt:true}}),p.receipts?db.receipt.findMany({where:{userId:p.userId,cancelledAt:null,receivedAt:null,expectedAt:{lt:end}},select:{expectedAt:true,receivedAt:true,cancelledAt:true}}):Promise.resolve([])]);
 const text=reminderText(reminderCounts(payments,receipts,p,now));if(!text)continue;
 // Recheck opt-out immediately before each delivery, including a subscription removed during the run.
 if(email){const current=await db.notificationPreference.findUnique({where:{userId:p.userId}});if(current?.emailEnabled&&current.emailVerified===p.user.email)attempts+=Number(await deliverOnce(p.userId,"email",p.user.email,day,()=>sendEmail(p.user.email,"DIZI · Seu resumo de pendências",`${text}.\nConfira e atualize seus registros: ${config.origin}/dashboard\nDesative os avisos em: ${config.origin}/notificacoes`,hash(`${p.userId}|email|${day}`))));}
 for(const sub of subs){if(await db.pushSubscription.count({where:{id:sub.id,userId:p.userId}}))attempts+=Number(await deliverOnce(p.userId,"push",sub.endpoint,day,()=>sendPush(sub,day)));}
 }
 cursor=prefs[prefs.length-1].userId;
 }
 return Response.json({error:"Time budget exceeded; rerun safely",attempts},{status:503});
 }catch{return Response.json({error:"Notification job failed"},{status:500});}
}
