import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema=z.object({token:z.string().min(20),password:z.string().min(8)});

export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json());
  if(!parsed.success) return NextResponse.json({error:"Link ou nova senha inválidos."},{status:400});

  const tokenHash=createHash("sha256").update(parsed.data.token).digest("hex");
  const record=await db.passwordResetToken.findUnique({where:{tokenHash}});
  if(!record || record.expiresAt < new Date()){
    if(record) await db.passwordResetToken.delete({where:{id:record.id}});
    return NextResponse.json({error:"Este link expirou ou já foi utilizado."},{status:400});
  }

  const passwordHash=await bcrypt.hash(parsed.data.password,10);
  await db.$transaction([
    db.user.update({where:{id:record.userId},data:{passwordHash}}),
    db.passwordResetToken.deleteMany({where:{userId:record.userId}})
  ]);

  return NextResponse.json({ok:true});
}
