"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordForm({token}:{token:string}) {
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setError(""); setLoading(true);
    const form=new FormData(e.currentTarget);
    const password=String(form.get("password")||"");
    const confirmPassword=String(form.get("confirmPassword")||"");
    if(password!==confirmPassword){setLoading(false);return setError("As senhas não coincidem.");}
    const res=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
    const data=await res.json(); setLoading(false);
    if(!res.ok) return setError(data.error || "Não foi possível redefinir a senha.");
    router.push("/login?senha=alterada");
    router.refresh();
  }

  if(!token) return <div className="auth-card"><div className="auth-logo"><span className="brand-mark">D</span></div><div><h1>Link inválido</h1><p>Solicite um novo link de recuperação de senha.</p></div><Link className="btn primary full big" href="/esqueci-a-senha">Solicitar novo link</Link></div>;

  return <form onSubmit={submit} className="auth-card">
    <div className="auth-logo"><span className="brand-mark">D</span></div>
    <div><h1>Crie uma nova senha</h1><p>Escolha uma senha com pelo menos 8 caracteres para sua conta DIZI.</p></div>
    <label>Nova senha<input name="password" type="password" minLength={8} required /></label>
    <label>Confirmar nova senha<input name="confirmPassword" type="password" minLength={8} required /></label>
    {error && <div className="form-error">{error}</div>}
    <button className="btn primary full big" disabled={loading}>{loading?"Salvando...":"Salvar nova senha"}</button>
    <div className="auth-switch"><Link href="/login">Voltar para entrar</Link></div>
  </form>
}
