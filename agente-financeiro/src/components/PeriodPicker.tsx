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
      <label htmlFor="period">
        Período
        <input
          id="period"
          name="month"
          type="month"
          defaultValue={month}
          min="1900-01"
          max="9998-12"
          required
        />
      </label>
      {status && <input type="hidden" name="status" value={status} />}
      <button className="btn secondary">Aplicar</button>
    </form>
  );
}
