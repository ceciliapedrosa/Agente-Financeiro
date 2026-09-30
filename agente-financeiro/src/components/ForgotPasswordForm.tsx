"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setLoading(true); setMessage(""); setError("");
    const form=new FormData(e.currentTarget);
    const res=await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email")})});
    const data=await res.json();
    setLoading(false);
    if(!res.ok) return setError(data.error || "Não foi possível solicitar a redefinição.");
    setMessage(data.message || "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
  }

  return <form onSubmit={submit} className="auth-card">
    <div className="auth-logo"><span className="brand-mark">D</span></div>
    <div><h1>Recupere sua senha</h1><p>Informe o e-mail da sua conta DIZI. Enviaremos um link temporário para criar uma nova senha.</p></div>
    <label>E-mail<input name="email" type="email" placeholder="voce@email.com" required /></label>
    {message && <div className="form-success">{message}</div>}
    {error && <div className="form-error">{error}</div>}
    <button className="btn primary full big" disabled={loading}>{loading?"Enviando...":"Enviar link de recuperação"}</button>
    <div className="auth-switch"><Link href="/login">Voltar para entrar</Link></div>
  </form>
}
