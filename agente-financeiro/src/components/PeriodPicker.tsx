import { MonthInput } from "./FormInputs";
export default function PeriodPicker({
  month,
  action,
  status,
}: {
  month: string;
  action: string;
  status?: string;
}) {
  return (
    <form action={action} className="period-picker">
      <label>
        Período
        <MonthInput month={month} />
      </label>
      {status && <input type="hidden" name="status" value={status} />}
      <button className="btn secondary">Aplicar</button>
    </form>
  );
}
