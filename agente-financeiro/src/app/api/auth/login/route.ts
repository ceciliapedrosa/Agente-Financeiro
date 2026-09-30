import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
export async function POST(req:Request){const {email,password}=await req.json(); const user=await db.user.findUnique({where:{email:String(email).toLowerCase()}}); if(!user || !(await bcrypt.compare(String(password),user.passwordHash))) return NextResponse.json({error:"E-mail ou senha inválidos."},{status:401}); await createSession(user.id); return NextResponse.json({ok:true});}
