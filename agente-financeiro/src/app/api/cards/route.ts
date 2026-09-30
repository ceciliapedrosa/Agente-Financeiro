import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

const schema=z.object({
  name:z.string().min(1),
  institution:z.string().min(1),
  creditLimit:z.coerce.number().min(0),
  currentInvoice:z.coerce.number().min(0),
  closingDay:z.coerce.number().int().min(1).max(31),
  dueDay:z.coerce.number().int().min(1).max(31)
});

export async function POST(req:Request){
  const userId=await getSessionUserId();
  if(!userId)return NextResponse.json({error:"Não autorizado"},{status:401});
  const parsed=schema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:"Confira os dados do cartão."},{status:400});
  const card=await db.card.create({data:{userId,...parsed.data}});
  return NextResponse.json(card);
}
