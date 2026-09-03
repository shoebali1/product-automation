const styles = {
  PENDING: { bg: "bg-slate-100 text-slate-700 border-slate-200/80", dot: "bg-slate-400" },
  PROCESSING: { bg: "bg-amber-50 text-amber-800 border-amber-200/80", dot: "bg-amber-500 animate-pulse" },
  SCRAPING: { bg: "bg-amber-50 text-amber-800 border-amber-200/80", dot: "bg-amber-500 animate-pulse" },
  ANALYZING: { bg: "bg-violet-50 text-violet-800 border-violet-200/80", dot: "bg-violet-500 animate-pulse" },
  COMPLETED: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80", dot: "bg-emerald-500" },
  SCRAPED: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80", dot: "bg-emerald-500" },
  DRAFT: { bg: "bg-sky-50 text-sky-800 border-sky-200/80", dot: "bg-sky-500" },
  REVIEW_REQUIRED: { bg: "bg-orange-50 text-orange-800 border-orange-200/80", dot: "bg-orange-500" },
  APPROVED: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80", dot: "bg-emerald-500" },
  PUBLISHED: { bg: "bg-teal-50 text-teal-800 border-teal-200/80", dot: "bg-teal-500" },
  FAILED: { bg: "bg-rose-50 text-rose-800 border-rose-200/80", dot: "bg-rose-500" },
};

export default function StatusBadge({ status, label }) {
  const conf = styles[status] || styles.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${conf.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      <span>{label || status?.replaceAll("_", " ")}</span>
    </span>
  );
}
