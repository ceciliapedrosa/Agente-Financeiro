"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Não foi possível continuar.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="auth-card">
      <div className="auth-logo"><span className="brand-mark">D</span></div>
      <div><h1>{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1><p>{mode === "login" ? "Entre para acessar sua organização financeira com a DIZI." : "Comece a organizar suas finanças com a DIZI em poucos minutos."}</p></div>
      {mode === "register" && <label>Nome completo<input name="name" placeholder="Seu nome" minLength={2} required /></label>}
      <label>E-mail<input name="email" type="email" placeholder="voce@email.com" required /></label>
      <label>Senha<input name="password" type="password" placeholder="Mínimo de 6 caracteres" minLength={6} required /></label>
      {mode === "login" && <div className="auth-switch" style={{textAlign:"right"}}><Link href="/esqueci-a-senha">Esqueci minha senha</Link></div>}
      {error && <div className="form-error">{error}</div>}
      <button className="btn primary full big" disabled={loading}>{loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar minha conta"}</button>
      <div className="auth-switch">{mode === "login" ? <>Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link></> : <>Já possui conta? <Link href="/login">Entrar</Link></>}</div>
    </form>
  );
}
