import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";

const schema=z.object({email:z.string().email()});

export async function POST(req:Request){
  try{
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success) return NextResponse.json({error:"Informe um e-mail válido."},{status:400});

    const email=parsed.data.email.toLowerCase();
    const user=await db.user.findUnique({where:{email}});
    const generic={message:"Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha."};
    if(!user) return NextResponse.json(generic);

    const apiKey=process.env.RESEND_API_KEY;
    const from=process.env.EMAIL_FROM;
    if(!apiKey || !from){
      return NextResponse.json({error:"O envio de e-mail da DIZI ainda não está configurado."},{status:503});
    }

    await db.passwordResetToken.deleteMany({where:{userId:user.id}});
    const token=randomBytes(32).toString("hex");
    const tokenHash=createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+60*60*1000)}});

    const appUrl=process.env.APP_URL || new URL(req.url).origin;
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
      const details=await mail.text().catch(()=>"");
      console.error("DIZI reset e-mail error",mail.status,details);
      return NextResponse.json({error:"Não foi possível enviar o e-mail de recuperação agora."},{status:502});
    }

    return NextResponse.json(generic);
  }catch(error){
    console.error("DIZI forgot-password error",error);
    return NextResponse.json({error:"Não foi possível concluir a recuperação agora. Tente novamente."},{status:500});
  }
}
