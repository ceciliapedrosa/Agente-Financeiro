"use client";
import {useEffect,useState,useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {type Preferences} from "@/lib/notification-rules";
type Props={preferences:Preferences;pushReady:boolean;emailReady:boolean;publicKey:string;emailEnabled:boolean;email:string;deviceCount:number;confirmToken?:string};
const subscribe=()=>()=>{};
const hasPush=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
export default function NotificationSettings(p:Props){
 const router=useRouter(),[prefs,setPrefs]=useState(p.preferences),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),supported=useSyncExternalStore(subscribe,hasPush,()=>false),[active,setActive]=useState(false),[permission,setPermission]=useState<NotificationPermission>("default");
 useEffect(()=>{if(supported){void navigator.serviceWorker.getRegistration("/").then(r=>r?.pushManager.getSubscription()).then(s=>{setPermission(Notification.permission);setActive(Boolean(s));}).catch(()=>{});}},[supported]);
 async function request(data:object){const r=await fetch("/api/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||"Não foi possível salvar.");return result;}
 async function run(action:()=>Promise<{message:string}>){setBusy(true);setMessage("");try{const result=await action();setMessage(result.message);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setBusy(false);}}
 function enablePush(){
 // Permission is requested directly in a user gesture (required on iOS).
 const permissionPromise=Notification.requestPermission();
 void run(async()=>{const value=await permissionPromise;setPermission(value);if(value!=="granted")throw new Error("Permissão não concedida. Você pode liberar as notificações nas configurações do navegador.");await navigator.serviceWorker.register("/sw.js",{scope:"/"});const reg=await navigator.serviceWorker.ready;const old=await reg.pushManager.getSubscription();
 const decoded=atob(p.publicKey.replace(/-/g,"+").replace(/_/g,"/")),key=Uint8Array.from(decoded,c=>c.charCodeAt(0));const sub=old||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 try{const result=await request({action:"subscribe",...sub.toJSON()});setActive(true);return result;}catch(e){await sub.unsubscribe();setActive(false);throw e;}});
 }
 return <div className="notification-settings">
 {p.confirmToken&&!p.emailEnabled&&<section className="panel notification-panel"><h2>Confirmar lembretes por e-mail</h2><p>Ative o resumo diário para {p.email}.</p><button className="btn primary" disabled={busy||!p.emailReady} onClick={()=>void run(()=>request({action:"confirmEmail",token:p.confirmToken!}))}>Confirmar meu e-mail e ativar</button></section>}
 <form className="panel notification-panel" onSubmit={e=>{e.preventDefault();void run(()=>request({action:"preferences",...prefs}));}}><h2>O que você quer acompanhar?</h2><p>Um resumo diário pela manhã, entre 9h e 10h (horário de Brasília), quando houver pendências. O recebimento pode variar conforme a conexão e o aparelho.</p>
 {([["upcoming","Pagamentos nos próximos 3 dias"],["dueToday","Pagamentos que vencem hoje"],["overdue","Pagamentos atrasados, incluindo valores parcialmente pagos"],["receipts","Receitas previstas para hoje ou atrasadas"]] as const).map(([key,label])=><label className="notification-option" key={key}><input type="checkbox" checked={prefs[key]} onChange={e=>setPrefs({...prefs,[key]:e.target.checked})}/><span>{label}</span></label>)}
 <p>Os avisos usam os registros do DIZI. Mantenha pagamentos e recebimentos atualizados.</p><button className="btn primary" disabled={busy}>Salvar tipos de aviso</button></form>
 <section className="panel notification-panel"><h2>No celular ou navegador</h2><p>O aviso na tela bloqueada não exibe nomes de contas nem valores. Ative separadamente em cada aparelho.</p>
 {!p.pushReady&&<p className="notification-warning">O envio para aparelhos aguarda a configuração do serviço. Suas preferências já podem ser salvas.</p>}
 {!supported&&<p>Se estiver no iPhone ou iPad, adicione o DIZI à Tela de Início pelo menu de compartilhamento e abra pelo ícone (iOS 16.4 ou posterior). Em outros aparelhos, use um navegador com suporte a notificações.</p>}
 {permission==="denied"&&<p>As notificações estão bloqueadas. Libere a permissão nas configurações do navegador ou do aparelho.</p>}
 <p>{p.deviceCount} aparelho(s) cadastrado(s) nesta conta.</p>
 <div className="notification-actions"><button className="btn primary" disabled={busy||!supported||!p.pushReady||permission==="denied"} onClick={enablePush}>{active?"Confirmar ativação neste aparelho":"Ativar neste aparelho"}</button>
 {active&&<button className="btn" disabled={busy} onClick={()=>void run(async()=>{const r=await navigator.serviceWorker.getRegistration("/");const sub=await r?.pushManager.getSubscription();if(sub){await request({action:"unsubscribe",endpoint:sub.endpoint});await sub.unsubscribe();}setActive(false);return {message:"Notificações desativadas neste aparelho."};})}>Desativar neste aparelho</button>}
 {p.deviceCount>0&&<button className="btn" disabled={busy} onClick={()=>void run(async()=>{const result=await request({action:"disablePush"});const r=await navigator.serviceWorker.getRegistration("/");await (await r?.pushManager.getSubscription())?.unsubscribe();setActive(false);return result;})}>Desativar em todos os aparelhos</button>}</div></section>
 <section className="panel notification-panel"><h2>Por e-mail</h2><p>Receba um resumo com a quantidade de pagamentos e receitas pendentes em {p.email}.</p><p>{p.emailEnabled?"Lembretes por e-mail ativados.":"Lembretes por e-mail desativados. A ativação exige confirmar o endereço."}</p>{!p.emailReady&&<p className="notification-warning">O envio de e-mail aguarda a configuração do serviço.</p>}<button className="btn" disabled={busy||(!p.emailReady&&!p.emailEnabled)} onClick={()=>void run(()=>request({action:p.emailEnabled?"disableEmail":"enableEmail"}))}>{p.emailEnabled?"Desativar e-mails":"Enviar e-mail de confirmação"}</button></section>
 <p role="status" aria-live="polite" className="notification-status">{busy?"Salvando…":message}</p>
 </div>;
}
