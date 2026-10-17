"use client";
import { useState } from "react";
import { DateInput, TextInput } from "./FormInputs";
import { occurrenceDates, type Frequency } from "@/lib/recurrence";
export default function RecurrenceFields({
  start,
  onFrequencyChange,
}: {
  start: string;
  onFrequencyChange?: (value: Frequency) => void;
}) {
  const [frequency, setFrequency] = useState<Frequency>("NONE"),
    [count, setCount] = useState("12"),
    [end, setEnd] = useState("");
  let dates: string[] = [];
  let error = "";
  if (frequency !== "NONE" && start) {
    try {
      dates = occurrenceDates(
        start,
        frequency,
        Number(count),
        end || undefined,
      );
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return (
    <fieldset className="recurrence-fields span2">
      <legend>Recorrência</legend>
      <div className="grid-form">
        <label>
          Frequência
          <select
            name="recurrence"
            value={frequency}
            onChange={(e) => {
              const value = e.target.value as Frequency;
              setFrequency(value);
              onFrequencyChange?.(value);
            }}
          >
            <option value="NONE">Uma única vez</option>
            <option value="MONTHLY">Mensal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </label>
        {frequency !== "NONE" && (
          <>
            <label>
              Quantidade de lançamentos
              <TextInput
                name="occurrences"
                type="number"
                min="2"
                max="60"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
              />
            </label>
            <label>
              Término opcional
              <DateInput
                name="recurrenceEnd"
                value={end}
                onChange={setEnd}
                min={start || undefined}
                required={false}
              />
            </label>
            <div className="recurrence-preview span2" aria-live="polite">
              <p>
                A primeira ocorrência usa a data informada acima. Ao salvar,
                serão criados automaticamente os lançamentos da prévia, até a
                quantidade ou o término escolhido. Não há renovação indefinida.
              </p>
              {!start ? (
                <p>Informe a primeira data para ver a prévia.</p>
              ) : error ? (
                <p role="alert">{error}</p>
              ) : (
                <>
                  <strong>{dates.length} lançamentos serão criados</strong>
                  <ol>
                    {dates.slice(0, 4).map((d) => (
                      <li key={d}>{d.split("-").reverse().join("/")}</li>
                    ))}
                  </ol>
                  {dates.length > 4 && (
                    <p>… até {dates.at(-1)!.split("-").reverse().join("/")}</p>
                  )}
                  <p>
                    Somente o primeiro pode começar pago ou recebido. Os demais
                    ficam pendentes. Datas como dia 31 usam o último dia dos
                    meses mais curtos.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </fieldset>
  );
}
