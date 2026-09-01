// One label/value pair inside a detail modal's <dl>. Shared by
// provider-detail-modal.tsx and ad-detail-modal.tsx.
export function DetailField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}
