import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { importRecords } from "@/lib/import-records";
export async function POST(req:Request){
 const userId=await getSessionUserId();if(!userId)return NextResponse.json({error:"Não autorizado"},{status:401});
 try{const text=await req.text();if(text.length>300000)return NextResponse.json({error:"Importação muito grande."},{status:413});const data=JSON.parse(text);const result=await db.$transaction(tx=>importRecords(tx,userId,data),{timeout:30000});return NextResponse.json(result);}
 catch(e){return NextResponse.json({error:e instanceof z.ZodError||e instanceof SyntaxError?"Revise nomes, valores e datas. Pagamentos e recebimentos precisam da data efetiva até hoje.":"Não foi possível importar. Nenhum lançamento desta tentativa foi gravado. Tente novamente."},{status:e instanceof z.ZodError||e instanceof SyntaxError?400:500});}
}
