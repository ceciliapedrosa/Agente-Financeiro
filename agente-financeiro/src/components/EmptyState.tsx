export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty actionable-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="quick-actions">{children}</div>
    </div>
  );
}
