const LABELS: Record<string, string> = {
  draft: "DRAFT",
  active: "ON SALE",
  reserved: "RESERVED",
  sold: "SOLD",
};

export function StatusLabel({ status }: { status: string }) {
  const look = status === "active" ? "bg-highlight" : status === "draft" ? "border-2 border-print" : "bg-print text-white";
  return <span className={`wide inline-flex h-6 items-center px-2 text-[10px] ${look}`}>{LABELS[status] ?? status.toUpperCase()}</span>;
}
