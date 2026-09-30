"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);

    try{
      const form=new FormData(e.currentTarget);
      const res=await fetch("/api/auth/forgot-password",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email:form.get("email")}),
        signal:controller.signal
      });

      const raw=await res.text();
      let data:any={};
      try{data=raw?JSON.parse(raw):{};}catch{data={};}

      if(!res.ok){
        throw new Error(data.error || "Não foi possível solicitar a redefinição.");
      }

      setMessage(data.message || "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
    }catch(err){
      if(err instanceof DOMException && err.name==="AbortError"){
        setError("O envio demorou mais do que o esperado. Tente novamente em instantes.");
      }else{
        setError(err instanceof Error ? err.message : "Não foi possível solicitar a redefinição.");
      }
    }finally{
      clearTimeout(timeout);
      setLoading(false);
    }
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
