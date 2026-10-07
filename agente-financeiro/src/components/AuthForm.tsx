"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "./PasswordInput";
import { TextInput } from "./FormInputs";

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
    try {
      const res = await fetch(
        `/api/auth/${mode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Não foi possível continuar.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="auth-card">
      <div className="auth-logo">
        <span className="brand-mark">D</span>
      </div>
      <div>
        <h1>{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
        <p>
          {mode === "login"
            ? "Entre para acessar sua organização financeira com a DIZI."
            : "Comece a organizar suas finanças com a DIZI em poucos minutos."}
        </p>
      </div>
      {mode === "register" && (
        <label>
          Nome completo
          <TextInput
            name="name"
            autoComplete="name"
            placeholder="Seu nome"
            minLength={2}
            required
          />
        </label>
      )}
      <label>
        E-mail
        <TextInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
        />
      </label>
      <PasswordInput register={mode === "register"} />
      {mode === "login" && (
        <div className="auth-switch" style={{ textAlign: "right" }}>
          <Link href="/esqueci-a-senha">Esqueci minha senha</Link>
        </div>
      )}
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <button className="btn primary full big" disabled={loading}>
        {loading
          ? "Carregando..."
          : mode === "login"
            ? "Entrar"
            : "Criar minha conta"}
      </button>
      <div className="auth-switch">
        {mode === "login" ? (
          <>
            Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link>
          </>
        ) : (
          <>
            Já possui conta? <Link href="/login">Entrar</Link>
          </>
        )}
      </div>
    </form>
  );
}
