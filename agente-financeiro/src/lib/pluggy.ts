import { z } from "zod";
export class BankError extends Error { constructor(message:string, public status=400){super(message);} }
export function bankAccess(userId:string) {
 return (process.env.SESSION_SECRET?.length??0)>=32 && process.env.BANK_CONNECTIONS_MODE === "sandbox" && !!process.env.PLUGGY_CLIENT_ID && !!process.env.PLUGGY_CLIENT_SECRET && (process.env.BANK_SANDBOX_USER_IDS??"").split(",").map(s=>s.trim()).includes(userId);
}
export async function pluggy(path:string,key?:string,method="GET",body?:unknown):Promise<unknown> {
 const response=await fetch(`https://api.pluggy.ai${path}`,{method,headers:{"Content-Type":"application/json",...(key?{"X-API-KEY":key}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new BankError(response.status===404?"Conexão não encontrada no provedor.":"O provedor não respondeu como esperado. Tente novamente mais tarde.",response.status===404?404:502);
 return response.status===204?{}:response.json();
}
export async function apiKey(){return z.object({apiKey:z.string()}).parse(await pluggy("/auth",undefined,"POST",{clientId:process.env.PLUGGY_CLIENT_ID,clientSecret:process.env.PLUGGY_CLIENT_SECRET})).apiKey;}
export const itemSchema=z.object({id:z.string(),status:z.string(),lastUpdatedAt:z.string().nullable().optional(),connector:z.object({id:z.number(),name:z.string(),isSandbox:z.boolean().optional()})});
export function requireSandbox(item:z.infer<typeof itemSchema>){if(item.connector.isSandbox!==true)throw new BankError("Esta etapa aceita somente bancos fictícios de teste.",403);}
const accountSchema=z.object({id:z.string(),itemId:z.string(),name:z.string(),type:z.string(),number:z.string().nullable().optional(),balance:z.number().nullable(),currencyCode:z.string()});
const transactionSchema=z.object({id:z.string(),accountId:z.string(),description:z.string(),amount:z.number(),date:z.string(),currencyCode:z.string(),type:z.string(),status:z.string()});
export const snapshotSchema=z.object({status:z.string(),bank:z.string(),lastUpdatedAt:z.string().nullable(),accounts:z.array(accountSchema),transactions:z.array(transactionSchema)});
export type BankSnapshot=z.infer<typeof snapshotSchema>;
export async function collectSnapshot(itemId:string,key:string):Promise<BankSnapshot>{
 const item=itemSchema.parse(await pluggy(`/items/${encodeURIComponent(itemId)}`,key));requireSandbox(item);
 if(item.id!==itemId)throw new BankError("Resposta inválida do provedor.",502);
 const accounts=z.object({results:z.array(accountSchema)}).parse(await pluggy(`/accounts?itemId=${encodeURIComponent(itemId)}&type=BANK`,key)).results;
 if(accounts.length>20||accounts.some(a=>a.itemId!==itemId))throw new BankError("Não foi possível conferir as contas retornadas.",502);
 const transactions:z.infer<typeof transactionSchema>[]=[];
 for(const account of accounts){
  let after:string|null=null;const seen=new Set<string>();
  for(let page=0;page<20;page++){
   const q=new URLSearchParams({accountId:account.id});if(after)q.set("after",after);
   const data=z.object({results:z.array(transactionSchema),next:z.string().nullable()}).parse(await pluggy(`/v2/transactions?${q}`,key));
   if(data.results.some(t=>t.accountId!==account.id))throw new BankError("Resposta inválida do provedor.",502);
   transactions.push(...data.results);if(transactions.length>10000)throw new BankError("O extrato ultrapassa o limite desta etapa de testes.");
   if(!data.next)break;
   // Never follow provider URLs or allow the cursor to change account ownership.
   after=new URLSearchParams(data.next.replace(/^\?/,"")).get("after");
   if(!after||seen.has(after)||page===19)throw new BankError("Não foi possível obter o extrato completo. Tente novamente.",502);
   seen.add(after);
  }
 }
 return {status:item.status,bank:item.connector.name,lastUpdatedAt:item.lastUpdatedAt??null,accounts:accounts.map(a=>({...a,number:a.number?`•••• ${a.number.slice(-4)}`:null})),transactions:[...new Map(transactions.map(t=>[`${t.accountId}:${t.id}`,t])).values()]};
}
