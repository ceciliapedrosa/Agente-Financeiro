import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

const createSchema=z.object({
  name:z.string().min(1),
  category:z.string().min(1),
  amount:z.coerce.number().positive(),
  expectedAt:z.string().min(1),
  recurring:z.union([z.boolean(),z.string()]).optional(),
  status:z.enum(["PENDING","RECEIVED"]).optional()
});

export async function POST(req:Request){
  const userId=await getSessionUserId();
  if(!userId)return NextResponse.json({error:"Não autorizado"},{status:401});
  const parsed=createSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Confira os dados da receita."},{status:400});
  const d=parsed.data;
  const received=d.status==="RECEIVED";
  const receipt=await db.receipt.create({data:{
    userId,
    name:d.name,
    category:d.category,
    amount:d.amount,
    expectedAt:new Date(d.expectedAt+"T12:00:00"),
    receivedAt:received?new Date(d.expectedAt+"T12:00:00"):null,
    recurring:d.recurring===true||d.recurring==="true"
  }});
  return NextResponse.json(receipt);
}

export async function PATCH(req:Request){
  const userId=await getSessionUserId();
  if(!userId)return NextResponse.json({error:"Não autorizado"},{status:401});
  const d=await req.json();
  if(!d.id)return NextResponse.json({error:"Receita inválida"},{status:400});
  const existing=await db.receipt.findFirst({where:{id:d.id,userId}});
  if(!existing)return NextResponse.json({error:"Receita não encontrada"},{status:404});
  const receipt=await db.receipt.update({where:{id:d.id},data:{receivedAt:d.received?new Date():null}});
  return NextResponse.json(receipt);
}
