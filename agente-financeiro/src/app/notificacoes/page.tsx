import {redirect} from "next/navigation";
import {getSessionUserId} from "@/lib/auth";
import {db} from "@/lib/db";
import {notificationConfig} from "@/lib/notifications";
import {defaultPreferences} from "@/lib/notification-rules";
import AppShell from "@/components/AppShell";
import NotificationSettings from "@/components/NotificationSettings";
export default async function Page({searchParams}:{searchParams:Promise<{confirm?:string}>}){
 const userId=await getSessionUserId();const query=await searchParams;const confirm=query.confirm&&/^[a-f0-9]{64}$/.test(query.confirm)?query.confirm:undefined;
 if(!userId)redirect(`/login${confirm?`?next=${encodeURIComponent(`/notificacoes?confirm=${confirm}`)}`:""}`);
 const user=await db.user.findUnique({where:{id:userId},include:{notificationPreference:true,_count:{select:{pushSubscriptions:true}}}});if(!user)redirect("/login");
 const pref=user.notificationPreference||defaultPreferences,config=notificationConfig();
 const last=await db.notificationDelivery.findFirst({where:{userId},orderBy:{createdAt:"desc"}});
 return <AppShell active="/notificacoes" userName={user.name}><main className="page"><div className="page-head"><div><span className="kicker">LEMBRETES</span><h1>Notificações</h1><p>Escolha os avisos que ajudam você a manter seu financeiro em dia.</p></div></div>
 <NotificationSettings preferences={{upcoming:pref.upcoming,dueToday:pref.dueToday,overdue:pref.overdue,receipts:pref.receipts}} pushReady={config.push} emailReady={config.email} publicKey={config.push?process.env.VAPID_PUBLIC_KEY!:""} emailEnabled={Boolean(user.notificationPreference?.emailEnabled&&user.notificationPreference.emailVerified===user.email)} email={user.email} deviceCount={user._count.pushSubscriptions} confirmToken={confirm}/>
 {last&&<p>Última tentativa: {last.createdAt.toLocaleString("pt-BR",{timeZone:"America/Fortaleza"})} · {last.channel==="email"?"e-mail":"aparelho"} · {last.status==="SENT"?"aceita pelo serviço de envio (a entrega depende do provedor)":last.status==="FAILED"?"falhou; haverá nova tentativa no próximo resumo diário":"envio iniciado; confirmação indisponível"}.</p>}
 </main></AppShell>;
}
