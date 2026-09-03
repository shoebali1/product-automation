import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import ProductAdminForm from "../components/review/ProductAdminForm";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/ToastProvider";
import { productsApi } from "../services/api";

export default function ProductReviewPage() {
  const { productId } = useParams();
  const [draft, setDraft] = useState(null);
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const productQuery = useQuery({ queryKey: ["product", productId], queryFn: () => productsApi.get(productId) });
  const conflictsQuery = useQuery({ queryKey: ["product-conflicts", productId], queryFn: () => productsApi.conflicts(productId) });

  useEffect(() => {
    if (productQuery.data) setDraft(structuredClone(productQuery.data.product_data));
  }, [productQuery.data]);

  const save = useMutation({
    mutationFn: () => productsApi.update(productId, { version: productQuery.data.version, product_data: draft, override_note: null }),
    onSuccess: (data) => { queryClient.setQueryData(["product", productId], data); notify("Draft changes saved."); },
    onError: (error) => notify(error.userMessage, "error"),
  });
  const approve = useMutation({
    mutationFn: () => productsApi.approve(productId),
    onSuccess: (data) => { queryClient.setQueryData(["product", productId], data); notify("Product approved."); },
    onError: (error) => notify(error.userMessage, "error"),
  });
  const publish = useMutation({
    mutationFn: () => productsApi.publish(productId),
    onSuccess: (data) => { queryClient.setQueryData(["product", productId], data); notify("Product published."); },
    onError: (error) => notify(error.userMessage, "error"),
  });
  const resolve = useMutation({
    mutationFn: ({ conflictId, payload }) => productsApi.resolveConflict(productId, conflictId, payload),
    onSuccess: () => {
      notify("Conflict resolved.");
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-conflicts", productId] });
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  if (productQuery.isPending || !draft) return <div className="panel h-96 animate-pulse bg-white/60" />;
  if (productQuery.isError) return <div className="panel p-8 text-rose-700 font-bold">{productQuery.error.userMessage}</div>;

  const product = productQuery.data;
  const openConflicts = conflictsQuery.data?.filter((item) => item.status === "OPEN") || [];
  const locked = ["APPROVED", "PUBLISHED"].includes(product.status);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900 transition-colors" to={`/research/jobs/${product.job_id}`}>
            <span>← Back to research evidence</span>
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-ink-950">Final Product Output</h1>
            <StatusBadge status={product.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">v{product.version}</span>
            <span>•</span>
            <span className="font-semibold text-emerald-700">Confidence {Math.round(Number(draft.overall_confidence || 0) * 100)}%</span>
            {product.published_external_id && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-600 font-medium">ID: {product.published_external_id}</span>
              </>
            )}
          </div>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap gap-2.5">
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-ink-950 shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            disabled={save.isPending || locked}
            onClick={() => save.mutate()}
            type="button"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>

          {product.status === "APPROVED" ? (
            <button
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:from-brand-700 hover:to-brand-800 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              disabled={publish.isPending}
              onClick={() => publish.mutate()}
              type="button"
            >
              {publish.isPending ? "Publishing…" : "Publish product"}
            </button>
          ) : product.status === "PUBLISHED" ? (
            <button
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-xs"
              disabled
              type="button"
            >
              Published
            </button>
          ) : (
            <button
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:from-brand-700 hover:to-brand-800 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              disabled={approve.isPending || conflictsQuery.isPending || openConflicts.length > 0}
              onClick={() => approve.mutate()}
              type="button"
            >
              {openConflicts.length ? `Resolve ${openConflicts.length} conflict${openConflicts.length === 1 ? "" : "s"}` : "Approve product"}
            </button>
          )}
        </div>
      </div>

      <QualityContext context={product.quality_context} />

      {draft.warnings?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Review warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-medium text-amber-900">
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Direct Final Product Form (Tabs & manual evidence note removed per user request) */}
      <fieldset className="border-0 p-0 disabled:pointer-events-none" disabled={locked || resolve.isPending}>
        <ProductAdminForm draft={draft} locked={locked} onChange={setDraft} />
      </fieldset>
    </div>
  );
}

function QualityContext({ context }) {
  if (!context) return null;
  const metricOrder = ["readiness", "confidence", "completeness", "source_coverage"];
  const tone = context.blockers.length ? "border-amber-200 bg-amber-50/20" : "border-emerald-200 bg-emerald-50/20";
  const gradeColor =
    context.grade === "A"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : context.grade === "B"
      ? "text-teal-700 bg-teal-50 border-teal-200"
      : context.grade === "C"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  return (
    <section className={`panel overflow-hidden ${tone}`}>
      {/* Header Info */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-xs border ${gradeColor}`}>
              {context.grade}
            </span>
            <div>
              <h2 className="text-base font-black text-ink-950 sm:text-lg">{context.headline}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{context.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-600">
            <span>{context.sources.successful_sources} sources</span>
            <span>·</span>
            <span>{context.sources.independent_domains} domains</span>
            <span>·</span>
            <span>{context.evidence.total_fields} compared fields</span>
          </div>
        </div>
      </div>

      {/* 4 Score Metrics (Single Clean Row) */}
      <div className="grid border-t border-slate-200/80 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {metricOrder.map((key) => (
          <QualityMetricCard key={key} metric={context.metrics[key]} />
        ))}
      </div>
    </section>
  );
}

function QualityMetricCard({ metric }) {
  if (!metric) return null;
  const barColor =
    metric.score >= 80 ? "bg-emerald-500" : metric.score >= 60 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="border-b border-slate-200/80 p-4 last:border-b-0 sm:border-r xl:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
        <p className="text-xl font-black text-ink-950">{metric.score}%</p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${metric.score}%` }} />
      </div>
    </div>
  );
}
