import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(6)});
export async function POST(req:Request){
 try{const data=schema.parse(await req.json()); const email=data.email.toLowerCase(); const exists=await db.user.findUnique({where:{email}}); if(exists)return NextResponse.json({error:"Este e-mail já está cadastrado."},{status:409}); const user=await db.user.create({data:{name:data.name,email,passwordHash:await bcrypt.hash(data.password,10)}}); await createSession(user.id); return NextResponse.json({ok:true});}
 catch{return NextResponse.json({error:"Confira os dados informados."},{status:400});}
}
