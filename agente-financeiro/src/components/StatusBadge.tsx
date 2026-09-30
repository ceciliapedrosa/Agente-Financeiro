const labels: Record<string,string> = { PENDING:"A pagar", UPCOMING:"Próximo", OVERDUE:"Atrasado", PAID:"Pago", PARTIAL:"Parcial" };
export default function StatusBadge({ status }: { status: string }) { return <span className={`status ${status.toLowerCase()}`}>{labels[status] || status}</span> }
