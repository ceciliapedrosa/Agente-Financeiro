import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {z} from "zod";
import {getSessionUserId} from "@/lib/auth";
import {db} from "@/lib/db";
import {apiKey,bankAccess,BankError,collectSnapshot,itemSchema,pluggy,requireSandbox} from "@/lib/pluggy";
export const maxDuration=60;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("start")}),
 z.object({action:z.literal("complete"),id:z.string().max(100),itemId:z.uuid(),connectToken:z.string().min(1).max(10000)}),
 z.object({action:z.literal("refresh"),id:z.string().max(100)}),
 z.object({action:z.literal("disconnect"),id:z.string().max(100)})
]);
export async function POST(req:Request){
 const userId=await getSessionUserId();if(!userId)return NextResponse.json({error:"Entre na sua conta."},{status:401});
 if(!bankAccess(userId))return NextResponse.json({error:"Conexão bancária em preparação. O piloto ainda não está habilitado para esta conta."},{status:503});
 if(req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"Origem não permitida."},{status:403});
 let lockedId:string|undefined;
 try{
  const text=await req.text();if(text.length>12000)throw new BankError("Solicitação muito grande.",413);
  const input=schema.parse(JSON.parse(text));
  if(input.action==="start"){
   const row=await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const recent=await tx.bankConnection.count({where:{userId,createdAt:{gt:new Date(Date.now()-60000)}}});
    const active=await tx.bankConnection.count({where:{userId,OR:[{itemId:{not:null}},{expiresAt:{gt:new Date()}}]}});
    if(recent>=2||active>=10)throw new BankError("Aguarde um minuto ou desconecte um teste anterior antes de continuar.",429);
    return tx.bankConnection.create({data:{userId,expiresAt:new Date(Date.now()+30*60000)}});
   });
   try{
    const key=await apiKey();
    const connectors=z.object({results:z.array(z.object({id:z.number(),isSandbox:z.boolean().optional()}))}).parse(await pluggy("/connectors?sandbox=true",key)).results.filter(c=>c.isSandbox===true).map(c=>c.id);
    if(!connectors.length)throw new BankError("Nenhum banco de teste disponível.",503);
    const {accessToken}=z.object({accessToken:z.string()}).parse(await pluggy("/connect_token",key,"POST",{options:{clientUserId:row.id,avoidDuplicates:true}}));
    await db.bankConnection.update({where:{id:row.id},data:{tokenHash:hash(accessToken)}});
    return NextResponse.json({id:row.id,connectToken:accessToken,connectorIds:connectors},{headers:{"Cache-Control":"no-store"}});
   }catch(e){await db.bankConnection.delete({where:{id:row.id}});throw e;}
  }
  const connection=await db.bankConnection.findFirst({where:{id:input.id,userId}});
  if(!connection)throw new BankError("Conexão não encontrada.",404);
  const lock=await db.bankConnection.updateMany({where:{id:connection.id,userId,OR:[{busyUntil:null},{busyUntil:{lt:new Date()}}]},data:{busyUntil:new Date(Date.now()+90000)}});
  if(!lock.count)throw new BankError("Esta conexão já está sendo atualizada. Aguarde.",409);lockedId=connection.id;
  if(input.action==="complete"){
   if(connection.itemId||!connection.tokenHash||connection.tokenHash!==hash(input.connectToken)||connection.expiresAt<new Date())throw new BankError("Este teste expirou ou já foi concluído. Inicie uma nova conexão.",409);
   // A privileged API key must never be used to claim an arbitrary client-supplied item.
   const item=itemSchema.parse(await pluggy(`/items/${input.itemId}`,input.connectToken));requireSandbox(item);
   if(item.id!==input.itemId)throw new BankError("Conexão inválida.",403);
   await db.bankConnection.update({where:{id:connection.id},data:{itemId:item.id,tokenHash:null}});
   return NextResponse.json({ok:true,message:"Conexão salva. Consulte os dados de teste."});
  }
  if(!connection.itemId)throw new BankError("Conexão ainda não concluída.",409);
  if(input.action==="refresh"&&connection.lastCheckedAt&&Date.now()-connection.lastCheckedAt.getTime()<60000)throw new BankError("Aguarde um minuto entre consultas.",429);
  const key=await apiKey();
  if(input.action==="disconnect"){
   // Only sandbox items can be removed by this pilot.
   try{const item=itemSchema.parse(await pluggy(`/items/${connection.itemId}`,key));requireSandbox(item);await pluggy(`/items/${connection.itemId}`,key,"DELETE");}catch(e){if(!(e instanceof BankError&&e.status===404))throw e;}
   await db.bankConnection.delete({where:{id:connection.id}});lockedId=undefined;
   return NextResponse.json({ok:true,message:"Conexão de teste removida do DIZI e do provedor."});
  }
  const snapshot=await collectSnapshot(connection.itemId,key);
  await db.bankConnection.update({where:{id:connection.id},data:{snapshot,lastCheckedAt:new Date()}});
  return NextResponse.json({ok:true,message:"Dados disponíveis no provedor consultados."});
 }catch(e){return NextResponse.json({error:e instanceof BankError?e.message:e instanceof z.ZodError||e instanceof SyntaxError?"Solicitação inválida.":"Não foi possível concluir. Tente novamente; os dados consultados anteriormente foram preservados."},{status:e instanceof BankError?e.status:e instanceof z.ZodError||e instanceof SyntaxError?400:502});}
 finally{if(lockedId)await db.bankConnection.updateMany({where:{id:lockedId,userId},data:{busyUntil:null}});}
}
