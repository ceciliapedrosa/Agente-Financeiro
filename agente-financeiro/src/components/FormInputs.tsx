"use client";
import { useId, useState, type InputHTMLAttributes } from "react";
import {
  parseBRMoney,
  formatBRMoney,
  parseBRDate,
  formatBRDate,
} from "@/lib/input-format";
type Props = InputHTMLAttributes<HTMLInputElement>;
function message(input: HTMLInputElement) {
  const v = input.validity;
  if (v.valueMissing) return "Preencha este campo.";
  if (v.typeMismatch) return "Informe um e-mail válido.";
  if (v.tooShort) return `Use pelo menos ${input.minLength} caracteres.`;
  if (v.rangeUnderflow) return `O mínimo permitido é ${input.min}.`;
  if (v.rangeOverflow) return `O máximo permitido é ${input.max}.`;
  if (v.stepMismatch || v.badInput) return "Informe um número válido.";
  return input.validationMessage || "Confira este campo.";
}
export function TextInput({ onChange, onInvalid, ...props }: Props) {
  const id = useId(),
    [error, setError] = useState("");
  return (
    <>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [props["aria-describedby"], error ? id : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onInvalid={(e) => {
          const text = message(e.currentTarget);
          setError(text);
          e.currentTarget.setCustomValidity(text);
          onInvalid?.(e);
        }}
        onChange={(e) => {
          e.currentTarget.setCustomValidity("");
          setError("");
          onChange?.(e);
        }}
      />
      {error && (
        <small id={id} className="field-error" role="alert">
          {error}
        </small>
      )}
    </>
  );
}
export function MoneyInput({
  name,
  defaultValue,
  min = 0.01,
  max = 999999999,
  required = true,
}: {
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  const [raw, setRaw] = useState(
    defaultValue === undefined ? "" : formatBRMoney(defaultValue),
  );
  const number = parseBRMoney(raw);
  return (
    <>
      <span className="money-input">
        <span aria-hidden="true">R$</span>
        <TextInput
          name={name + "Input"}
          inputMode="decimal"
          value={raw}
          placeholder="0,00"
          required={required}
          onChange={(e) => {
            const value = e.target.value,
              n = parseBRMoney(value);
            setRaw(value);
            e.currentTarget.setCustomValidity(
              !value && !required
                ? ""
                : n === null
                  ? "Use o formato brasileiro, por exemplo: 1.600,00."
                  : n < min || n > max
                    ? `Informe um valor entre R$ ${formatBRMoney(min)} e R$ ${formatBRMoney(max)}.`
                    : "",
            );
          }}
          onBlur={() => {
            if (number !== null) setRaw(formatBRMoney(number));
          }}
        />
      </span>
      <input type="hidden" name={name} value={number ?? ""} />
    </>
  );
}
export function DateInput({
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  max,
  required = true,
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  const [raw, setRaw] = useState(formatBRDate(value ?? defaultValue));
  const iso = parseBRDate(raw);
  return (
    <>
      <TextInput
        name={name + "Input"}
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={raw}
        required={required}
        onChange={(e) => {
          const text = e.target.value,
            next = parseBRDate(text);
          setRaw(text);
          onChange?.(next);
          e.currentTarget.setCustomValidity(
            !text && !required
              ? ""
              : !next
                ? "Informe uma data válida no formato DD/MM/AAAA."
                : min && next < min
                  ? `Use uma data a partir de ${formatBRDate(min)}.`
                  : max && next > max
                    ? `Use uma data até ${formatBRDate(max)}.`
                    : "",
          );
        }}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
export function MonthInput({
  month,
  allowAll = false,
}: {
  month: string;
  allowAll?: boolean;
}) {
  const [raw, setRaw] = useState(
    month === "all" ? "" : month.split("-").reverse().join("/"),
  );
  const valid = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(raw);
  const iso = valid ? `${valid[2]}-${valid[1]}` : "";
  return (
    <>
      <TextInput
        name="monthInput"
        inputMode="numeric"
        placeholder={allowAll ? "MM/AAAA ou deixe vazio" : "MM/AAAA"}
        maxLength={7}
        value={raw}
        required={!allowAll}
        onChange={(e) => {
          const value = e.target.value,
            m = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value);
          setRaw(value);
          e.currentTarget.setCustomValidity(
            !value && allowAll
              ? ""
              : m && +m[2] >= 1900 && +m[2] <= 9998
                ? ""
                : "Informe mês e ano no formato MM/AAAA.",
          );
        }}
      />
      <input
        type="hidden"
        name="month"
        value={iso || (allowAll ? "all" : "")}
      />
      {allowAll && <small className="field-hint">Vazio: todos os meses.</small>}
    </>
  );
}
