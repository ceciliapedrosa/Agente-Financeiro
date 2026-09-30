import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";

const schema=z.object({email:z.string().email()});

export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json());
  if(!parsed.success) return NextResponse.json({error:"Informe um e-mail válido."},{status:400});

  const email=parsed.data.email.toLowerCase();
  const user=await db.user.findUnique({where:{email}});
  const generic={message:"Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha."};
  if(!user) return NextResponse.json(generic);

  const apiKey=process.env.RESEND_API_KEY;
  const appUrl=process.env.APP_URL;
  const from=process.env.EMAIL_FROM;
  if(!apiKey || !appUrl || !from){
    return NextResponse.json({error:"A recuperação por e-mail ainda não está configurada."},{status:503});
  }

  await db.passwordResetToken.deleteMany({where:{userId:user.id}});
  const token=randomBytes(32).toString("hex");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  await db.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+60*60*1000)}});

  const resetUrl=`${appUrl.replace(/\/$/,"")}/redefinir-senha?token=${token}`;
  const mail=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,
      to:[user.email],
      subject:"Redefinição de senha - DIZI",
      html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#19202a"><h2>DIZI</h2><p>Olá, ${user.name}.</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}" style="display:inline-block;background:#0d6b58;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Criar nova senha</a></p><p>Este link expira em 1 hora. Se você não solicitou a alteração, ignore este e-mail.</p></div>`
    })
  });

  if(!mail.ok){
    await db.passwordResetToken.deleteMany({where:{userId:user.id}});
    return NextResponse.json({error:"Não foi possível enviar o e-mail de recuperação agora."},{status:502});
  }

  return NextResponse.json(generic);
}
