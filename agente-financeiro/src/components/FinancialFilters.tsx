import Link from "next/link";
import DateRangeFields from "./DateRangeFields";
import type {DateRange} from "@/lib/date-range";
export default function FinancialFilters({
  action,
  period,
  status,
  q,
  category,
  sort,
  categories,
  receipts = false,
}: {
  action: string;
  period: DateRange;
  status: string;
  q: string;
  category: string;
  sort: string;
  categories: string[];
  receipts?: boolean;
}) {
  return (
    <form action={action} className="filter-form">
      <label>
        Buscar pelo nome
        <input
          name="q"
          type="search"
          defaultValue={q}
          maxLength={200}
          placeholder={receipts ? "Ex.: Salário" : "Ex.: Internet"}
        />
      </label>
      <DateRangeFields key={period.search} from={period.from} to={period.to} all={period.all} allowAll/>
      {period.error&&<p role="alert">{period.error}</p>}
      <p className="period-note">Período aplicado: {period.label}.</p>
      <details className="extra-filters" open={!!category || sort !== "date_asc" || (receipts && status !== "ALL")}><summary>Mais filtros{category || sort !== "date_asc" || (receipts && status !== "ALL") ? " · ativos" : ""}</summary><div className="extra-filter-fields">
      <label>
        Categoria
        <select name="category" defaultValue={category}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ordenar por
        <select name="sort" defaultValue={sort}>
          <option value="date_asc">
            {receipts ? "Previsão: mais próxima" : "Vencimento: mais próximo"}
          </option>
          <option value="date_desc">
            {receipts ? "Previsão: mais distante" : "Vencimento: mais distante"}
          </option>
          <option value="amount_desc">Maior valor</option>
          <option value="amount_asc">Menor valor</option>
        </select>
      </label>
      {receipts ? (
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="ALL">Todos</option>
            <option value="PENDING">Previstas</option>
            <option value="RECEIVED">Recebidas</option>
            <option value="OVERDUE">Atrasadas</option>
            <option value="UPCOMING">Hoje e próximos 7 dias</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="status" value={status} />
      )}
      </div></details>
      <div className="filter-actions">
        <button className="btn primary">Filtrar</button>
        <Link className="btn secondary" href={`${action}?${period.search}`}>
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
