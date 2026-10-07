export type SearchRow = { name: string; category: string; amount: number };
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
export function filterFinancialRows<T extends SearchRow>(
  rows: T[],
  query: string,
  category: string,
  sort: string,
  date: (row: T) => Date,
): T[] {
  const term = normalizeSearch(query);
  return rows
    .filter(
      (r) =>
        (!term || normalizeSearch(r.name).includes(term)) &&
        (!category || r.category === category),
    )
    .sort((a, b) => {
      const result =
        sort === "amount_desc"
          ? b.amount - a.amount
          : sort === "amount_asc"
            ? a.amount - b.amount
            : sort === "date_desc"
              ? date(b).getTime() - date(a).getTime()
              : date(a).getTime() - date(b).getTime();
      return result || a.name.localeCompare(b.name, "pt-BR");
    });
}
