"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { TextInput } from "./FormInputs";
export default function PasswordInput({
  register = false,
}: {
  register?: boolean;
}) {
  const [visible, setVisible] = useState(false),
    id = useId(),
    hint = useId();
  return (
    <div className="password-field">
      <label htmlFor={id}>Senha</label>
      <div className="password-input">
        <TextInput
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={register ? "new-password" : "current-password"}
          placeholder={register ? "Crie sua senha" : "Digite sua senha"}
          minLength={register ? 6 : undefined}
          required
          aria-describedby={register ? hint : undefined}
        />
        <button
          type="button"
          className="icon-btn"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {register && (
        <small id={hint} className="field-hint">
          Use pelo menos 6 caracteres. Prefira uma combinação de letras, números
          e símbolos.
        </small>
      )}
    </div>
  );
}
