import Link from "next/link";
import { MonthInput } from "./FormInputs";
export default function FinancialFilters({
  action,
  month,
  status,
  q,
  category,
  sort,
  categories,
  urgent = false,
  receipts = false,
}: {
  action: string;
  month: string;
  status: string;
  q: string;
  category: string;
  sort: string;
  categories: string[];
  urgent?: boolean;
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
      {urgent ? (
        <input type="hidden" name="month" value={month} />
      ) : (
        <label>
          Período
          <MonthInput month={month} allowAll />
        </label>
      )}
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
          </select>
        </label>
      ) : (
        <input type="hidden" name="status" value={status} />
      )}
      <div className="filter-actions">
        <button className="btn primary">Filtrar</button>
        <Link className="btn secondary" href={action}>
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
