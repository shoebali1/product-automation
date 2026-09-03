const styles = {
  PENDING: "bg-slate-100 text-slate-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  SCRAPING: "bg-amber-100 text-amber-800",
  ANALYZING: "bg-violet-100 text-violet-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  SCRAPED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-sky-100 text-sky-800",
  REVIEW_REQUIRED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PUBLISHED: "bg-teal-100 text-teal-800",
  FAILED: "bg-rose-100 text-rose-800",
};

export default function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.PENDING}`}>
      {label || status?.replaceAll("_", " ")}
    </span>
  );
}
