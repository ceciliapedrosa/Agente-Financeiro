"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
import {useRouter} from "next/navigation";
const Connect=dynamic(()=>import("react-pluggy-connect").then(m=>m.PluggyConnect),{ssr:false});
type Session={id:string;connectToken:string;connectorIds:number[]};
export default function BankConnect({enabled,id}:{enabled:boolean;id?:string}){
 const router=useRouter();const [session,setSession]=useState<Session|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[confirm,setConfirm]=useState(false),[accepted,setAccepted]=useState(false);
 async function action(action:string,extra:Record<string,string>={}){
  setBusy(true);setMessage("");
  try{const response=await fetch("/api/banks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...(id?{id}:{}),...extra})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível concluir.");if(action==="start")setSession(result);else {setSession(null);setConfirm(false);setMessage(result.message);router.refresh();}}
  catch(e){setMessage(e instanceof Error?e.message:"Não foi possível conectar.");}
  finally{setBusy(false);}
 }
 return <div className="bank-actions">
 {!id&&enabled&&<label className="bank-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Entendi que este piloto usa apenas bancos fictícios da Pluggy. Não informarei credenciais de bancos reais.</label>}
 {!id?<button className="btn primary" disabled={!enabled||busy||!accepted} onClick={()=>action("start")}>{busy?"Preparando…":"Conectar banco de teste"}</button>:<><button className="btn secondary" disabled={!enabled||busy} onClick={()=>action("refresh")}>{busy?"Aguarde…":"Consultar dados de teste"}</button><button className="btn secondary" disabled={!enabled||busy} onClick={()=>setConfirm(true)}>Desconectar teste</button></>}
 {confirm&&<div role="group" aria-label="Confirmar desconexão"><p>A conexão e os dados fictícios deste teste serão removidos do DIZI e da Pluggy. Seus lançamentos manuais permanecem.</p><button className="btn secondary" disabled={busy} onClick={()=>setConfirm(false)}>Voltar</button><button className="btn primary" disabled={busy} onClick={()=>action("disconnect")}>Confirmar desconexão</button></div>}
 {message&&<p role="status">{message}</p>}
 {session&&<Connect connectToken={session.connectToken} includeSandbox connectorIds={session.connectorIds} products={["ACCOUNTS","TRANSACTIONS"]} language="pt" theme="light" onSuccess={({item})=>action("complete",{id:session.id,itemId:item.id,connectToken:session.connectToken})} onClose={()=>setSession(null)} onError={()=>{setMessage("Não foi possível concluir o teste. Feche e tente novamente.");}} onLoadError={()=>{setSession(null);setMessage("Não foi possível abrir a conexão. Tente novamente.");}}/>}
 </div>;
}
