import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {z} from "zod";
import {getSessionUserId} from "@/lib/auth";
import {db} from "@/lib/db";
import {allowedPushEndpoint} from "@/lib/notification-rules";
import {hash,notificationConfig,sendEmail} from "@/lib/notifications";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("preferences"),upcoming:z.boolean(),dueToday:z.boolean(),overdue:z.boolean(),receipts:z.boolean()}),
 z.object({action:z.literal("subscribe"),endpoint:z.string().max(2048).refine(allowedPushEndpoint),keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}$/),auth:z.string().regex(/^[A-Za-z0-9_-]{22}$/)})}),
 z.object({action:z.literal("unsubscribe"),endpoint:z.string().max(2048)}),
 z.object({action:z.enum(["disablePush","enableEmail","disableEmail"])}),
 z.object({action:z.literal("confirmEmail"),token:z.string().regex(/^[a-f0-9]{64}$/)})]);
export async function POST(req:Request){
 const userId=await getSessionUserId();if(!userId)return NextResponse.json({error:"Entre na sua conta."},{status:401});
 if(req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Origem inválida."},{status:403});
 try{
 const raw=await req.text();if(raw.length>8192)return NextResponse.json({error:"Solicitação muito grande."},{status:413});
 const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:"Dados inválidos."},{status:400});const d=parsed.data,config=notificationConfig();
 await db.notificationPreference.upsert({where:{userId},create:{userId},update:{}});
 if(d.action==="preferences"){const {action:_,...prefs}=d;void _;await db.notificationPreference.update({where:{userId},data:prefs});}
 if(d.action==="subscribe"){
 if(!config.push)return NextResponse.json({error:"Notificações no aparelho ainda não foram configuradas."},{status:503});
 const ok=await db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;const existing=await tx.pushSubscription.findUnique({where:{endpoint:d.endpoint}});if(existing&&existing.userId!==userId)return false;if(!existing&&await tx.pushSubscription.count({where:{userId}})>=5)return false;await tx.pushSubscription.upsert({where:{endpoint:d.endpoint},create:{userId,endpoint:d.endpoint,...d.keys},update:d.keys});return true;});
 if(!ok)return NextResponse.json({error:"Este navegador está vinculado a outra conta ou o limite de 5 aparelhos foi atingido. Desative a inscrição anterior e tente novamente."},{status:409});
 }
 if(d.action==="unsubscribe")await db.pushSubscription.deleteMany({where:{userId,endpoint:d.endpoint}});
 if(d.action==="disablePush")await db.pushSubscription.deleteMany({where:{userId}});
 if(d.action==="disableEmail")await db.notificationPreference.update({where:{userId},data:{emailEnabled:false,emailTokenHash:null,emailTokenExpires:null}});
 if(d.action==="enableEmail"){
 if(!config.email)return NextResponse.json({error:"Envio de e-mail ainda não foi configurado."},{status:503});
 const user=await db.user.findUniqueOrThrow({where:{id:userId}}),token=randomBytes(32).toString("hex"),now=new Date();
 const claim=await db.notificationPreference.updateMany({where:{userId,OR:[{emailRequestedAt:null},{emailRequestedAt:{lt:new Date(+now-600000)}}]},data:{emailRequestedAt:now,emailTokenHash:hash(token),emailTokenExpires:new Date(+now+3600000)}});
 if(!claim.count)return NextResponse.json({error:"Aguarde 10 minutos antes de pedir outro e-mail de confirmação."},{status:429});
 await sendEmail(user.email,"Confirme os lembretes do DIZI",`Para receber seu resumo diário de pendências, abra o link, entre na sua conta e confirme:\n${config.origin}/notificacoes?confirm=${token}\nO link expira em 1 hora. Se você não pediu, ignore este e-mail.`,hash(token));
 return NextResponse.json({message:"Enviamos a confirmação para seu e-mail. Abra o link para ativar os lembretes."});
 }
 if(d.action==="confirmEmail"){
 const user=await db.user.findUniqueOrThrow({where:{id:userId}});const result=await db.notificationPreference.updateMany({where:{userId,emailTokenHash:hash(d.token),emailTokenExpires:{gt:new Date()}},data:{emailEnabled:true,emailVerified:user.email,emailTokenHash:null,emailTokenExpires:null}});if(!result.count)return NextResponse.json({error:"Link inválido ou expirado. Solicite outra confirmação."},{status:400});
 }
 return NextResponse.json({message:"Preferências atualizadas."});
 }catch{return NextResponse.json({error:"Não foi possível concluir agora. Tente novamente."},{status:500});}
}
