import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import ProductAdminForm from "../components/review/ProductAdminForm";
import ReviewTab from "../components/review/ReviewEditors";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/ToastProvider";
import { productsApi } from "../services/api";

const tabs = ["Storefront Form", "Overview", "Highlights", "Description", "Specifications", "Images", "Variations", "Packs", "Pricing", "SEO", "Sources", "Conflicts", "Raw JSON Output"];

export default function ProductReviewPage() {
  const { productId } = useParams();
  const [activeTab, setActiveTab] = useState("Storefront Form");
  const [draft, setDraft] = useState(null);
  const [overrideNote, setOverrideNote] = useState("");
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const productQuery = useQuery({ queryKey: ["product", productId], queryFn: () => productsApi.get(productId) });
  const conflictsQuery = useQuery({ queryKey: ["product-conflicts", productId], queryFn: () => productsApi.conflicts(productId) });

  useEffect(() => {
    if (productQuery.data) setDraft(structuredClone(productQuery.data.product_data));
  }, [productQuery.data]);

  const save = useMutation({
    mutationFn: () => productsApi.update(productId, { version: productQuery.data.version, product_data: draft, override_note: overrideNote.trim() || null }),
    onSuccess: (data) => { queryClient.setQueryData(["product", productId], data); setOverrideNote(""); notify("Draft changes saved."); },
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

  if (productQuery.isPending || !draft) return <div className="panel h-96 animate-pulse bg-white" />;
  if (productQuery.isError) return <div className="panel p-8 text-rose-700">{productQuery.error.userMessage}</div>;

  const product = productQuery.data;
  const openConflicts = conflictsQuery.data?.filter((item) => item.status === "OPEN") || [];
  const locked = ["APPROVED", "PUBLISHED"].includes(product.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link className="text-sm font-bold text-brand-700 hover:underline" to={`/research/jobs/${product.job_id}`}>← Research evidence</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black tracking-tight">Final Product Output</h1><StatusBadge status={product.status} /></div>
          <p className="mt-2 text-sm text-ink-500">Version {product.version} · Confidence {Math.round(Number(draft.overall_confidence) * 100)}%{product.published_external_id ? ` · ${product.published_external_id}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold hover:bg-slate-50 disabled:opacity-50" disabled={save.isPending || locked} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save changes"}</button>
          {product.status === "APPROVED" ? <button className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-50" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? "Publishing…" : "Publish product"}</button> : product.status === "PUBLISHED" ? <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white" disabled>Published</button> : <button className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-50" disabled={approve.isPending || conflictsQuery.isPending || openConflicts.length > 0} onClick={() => approve.mutate()}>{openConflicts.length ? `Resolve ${openConflicts.length} conflict${openConflicts.length === 1 ? "" : "s"}` : "Approve product"}</button>}
        </div>
      </div>

      <QualityContext context={product.quality_context} onOpenConflicts={() => setActiveTab("Conflicts")} />

      {draft.warnings?.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-extrabold text-amber-900">Review warnings</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}

      <label className="panel block p-4">
        <span className="label">Manual evidence note</span>
        <input className="field" disabled={locked} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Explain any field edits that override verified source evidence" value={overrideNote} />
        <span className="mt-2 block text-xs text-ink-500">Source evidence stays read-only. This note is submitted with the next save when an evidence-backed value is changed.</span>
      </label>

      <div className={`panel overflow-hidden ${locked ? "opacity-80" : ""}`}>
        <div className="overflow-x-auto border-b border-slate-200 bg-slate-50/70"><div className="flex min-w-max px-3">{tabs.map((tab) => <button className={`border-b-2 px-4 py-4 text-sm font-bold ${activeTab === tab ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-950"}`} key={tab} onClick={() => setActiveTab(tab)}>{tab}{tab === "Conflicts" && openConflicts.length ? ` (${openConflicts.length})` : ""}</button>)}</div></div>
        <fieldset className="border-0 p-0 disabled:pointer-events-none" disabled={locked || resolve.isPending}>
          <div className="p-5 sm:p-7">
            {activeTab === "Storefront Form" ? (
              <ProductAdminForm draft={draft} locked={locked} onChange={setDraft} />
            ) : (
              <ReviewTab activeTab={activeTab} conflicts={conflictsQuery.data || []} draft={draft} onChange={setDraft} onResolve={(conflictId, payload) => resolve.mutate({ conflictId, payload })} />
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function QualityContext({ context, onOpenConflicts }) {
  if (!context) return null;
  const metricOrder = ["readiness", "confidence", "completeness", "source_coverage"];
  const tone = context.blockers.length ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/50";
  return (
    <section className={`panel overflow-hidden ${tone}`}>
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-brand-700 shadow-sm">{context.grade}</span>
            <div><h2 className="text-lg font-black">{context.headline}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">{context.summary}</p></div>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-500">Evidence: {context.sources.successful_sources} sources · {context.sources.independent_domains} domains · {context.evidence.total_fields} compared fields</p>
        </div>
        {context.evidence.conflicted_fields > 0 && <button className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-800" onClick={onOpenConflicts}>Review {context.evidence.conflicted_fields} conflict{context.evidence.conflicted_fields === 1 ? "" : "s"}</button>}
      </div>
      <div className="grid border-t border-slate-200/80 bg-white/70 sm:grid-cols-2 xl:grid-cols-4">
        {metricOrder.map((key) => <QualityMetricCard key={key} metric={context.metrics[key]} />)}
      </div>
      {(context.blockers.length > 0 || context.next_actions.length > 0 || context.strengths.length > 0) && <div className="grid gap-6 border-t border-slate-200/80 bg-white p-5 sm:p-7 lg:grid-cols-3">
        <ContextList title="What is blocking quality" empty="No quality blockers." items={context.blockers.map((item) => `${item.title}: ${item.detail}`)} tone="text-rose-700" />
        <ContextList title="Recommended next steps" empty="Final human review is the only remaining step." items={context.next_actions} tone="text-amber-800" />
        <ContextList title="What is already strong" empty="Strengths will appear as evidence and content improve." items={context.strengths} tone="text-emerald-700" />
      </div>}
      <details className="border-t border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:px-7">
        <summary className="cursor-pointer text-sm font-extrabold text-brand-700">How these scores are calculated</summary>
        <div className="mt-3 grid gap-3 text-sm text-ink-700 md:grid-cols-2">{metricOrder.map((key) => <p key={key}><strong>{context.metrics[key].label}:</strong> {context.metrics[key].explanation}</p>)}</div>
      </details>
    </section>
  );
}

function QualityMetricCard({ metric }) {
  return <div className="border-b border-slate-200/80 p-5 last:border-b-0 sm:border-r xl:border-b-0"><div className="flex items-baseline justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">{metric.label}</p><p className="text-2xl font-black text-ink-950">{metric.score}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${metric.score >= 80 ? "bg-emerald-600" : metric.score >= 60 ? "bg-amber-500" : "bg-rose-600"}`} style={{ width: `${metric.score}%` }} /></div></div>;
}

function ContextList({ title, items, empty, tone }) {
  return <div><h3 className={`text-sm font-extrabold ${tone}`}>{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-5 text-ink-700">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-ink-500">{empty}</p>}</div>;
}
