import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";

import StatusBadge from "../components/StatusBadge";
import { useToast } from "../components/ToastProvider";
import { researchApi } from "../services/api";

const activeStatuses = new Set(["PENDING", "SCRAPING", "ANALYZING"]);

export default function JobStatusPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["research-job", jobId],
    queryFn: () => researchApi.getJob(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isGenerating || activeStatuses.has(status) ? 2000 : false;
    },
  });

  useEffect(() => {
    if (jobQuery.data?.latest_product_id) {
      setIsGenerating(false);
    }
  }, [jobQuery.data?.latest_product_id]);

  const retrySource = useMutation({
    mutationFn: (sourceId) => researchApi.retrySource(jobId, sourceId),
    onSuccess: () => {
      notify("Source retry queued.");
      queryClient.invalidateQueries({ queryKey: ["research-job", jobId] });
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const generate = useMutation({
    mutationFn: () => researchApi.generate(jobId),
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: () => {
      notify("Draft generation queued with AI. Generating final catalog output…");
      queryClient.setQueryData(["research-job", jobId], (current) =>
        current ? { ...current, status: "ANALYZING" } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["research-job", jobId] });
    },
    onError: (error) => {
      setIsGenerating(false);
      notify(error.userMessage, "error");
    },
  });

  if (jobQuery.isPending) return <JobSkeleton />;
  if (jobQuery.isError) return <ErrorPanel message={jobQuery.error.userMessage} />;
  const job = jobQuery.data;
  const completed = job.successful_urls + job.failed_urls;
  const progress = job.total_urls ? Math.round((completed / job.total_urls) * 100) : 0;
  const generationActive = job.status === "ANALYZING" || isGenerating;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900 transition-colors" to="/research">
            ← New research job
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-ink-950">Research progress</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-slate-500">Job ID: {job.id}</p>
        </div>
        <div className="flex gap-3">
          {(job.status === "SCRAPED" || generationActive) && !job.latest_product_id && (
            <button
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-xs font-black text-white shadow-xs hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 transition-all cursor-pointer"
              disabled={generate.isPending || generationActive}
              onClick={() => generate.mutate()}
            >
              {generate.isPending || generationActive
                ? "Generating with AI…"
                : "Generate draft"}
            </button>
          )}
          {job.latest_product_id && (
            <Link
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-xs font-black text-white shadow-xs hover:from-brand-700 hover:to-brand-800 transition-all cursor-pointer"
              to={`/products/${job.latest_product_id}`}
            >
              Review draft →
            </Link>
          )}
        </div>
      </div>

      {job.error_summary && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 shadow-xs">
          {job.error_summary}
        </div>
      )}

      <WorkflowProgress job={job} generationActive={generationActive} />

      {job.status === "SCRAPED" && !job.latest_product_id && !generationActive && (
        <section className="rounded-2xl border-2 border-brand-300 bg-gradient-to-r from-brand-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-700">Next step required</p>
              <h2 className="mt-1 text-lg font-black text-ink-950">Sources analyzed — generate the product draft</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                Scraping is complete. Start AI generation to combine the source data into the final catalog record.
              </p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-xs font-black text-white shadow-sm transition-all hover:from-brand-700 hover:to-brand-800 disabled:opacity-50"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
              type="button"
            >
              {generate.isPending ? "Starting AI…" : "Generate draft →"}
            </button>
          </div>
        </section>
      )}

      {generationActive && !job.latest_product_id && (
        <div aria-live="polite" className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-violet-50/90 p-5 text-violet-950 shadow-xs">
          <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <div>
            <p className="font-bold text-sm">AI generation in progress…</p>
            <p className="mt-0.5 text-xs text-violet-800">Synthesizing product data from scraped sources and generating final catalog output. This page updates automatically.</p>
          </div>
        </div>
      )}

      {job.latest_product_id && (
        <section className="rounded-2xl border border-brand-300 bg-gradient-to-r from-brand-50 via-white to-emerald-50/40 p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <h2 className="text-base font-black text-ink-950">Final Product Output Ready</h2>
              </div>
              <p className="text-xs text-slate-600">
                AI has successfully synthesized and structured the final product data across all verified sources.
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-xs font-black text-white shadow-xs hover:bg-brand-600 transition-colors"
              to={`/products/${job.latest_product_id}`}
            >
              <span>View Final Product & Output</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{completed} of {job.total_urls} sources finished</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <Metric label="Successful" tone="text-emerald-700" value={job.successful_urls} />
            <Metric label="Failed" tone="text-rose-700" value={job.failed_urls} />
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Source processing</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {job.sources.map((source) => (
            <article className="grid gap-4 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={source.id}>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={source.status} />
                  <span className="text-[11px] font-bold text-slate-400">Attempt {source.attempts}</span>
                </div>
                <p className="truncate text-xs font-bold text-ink-950">{source.domain}</p>
                <a className="block truncate text-[11px] text-slate-400 hover:text-brand-700 hover:underline" href={source.url} rel="noreferrer" target="_blank">
                  {source.url}
                </a>
                {source.error && <p className="mt-1.5 text-xs font-semibold text-rose-600">{source.error}</p>}
              </div>
              {source.status === "FAILED" && (
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={retrySource.isPending}
                  onClick={() => retrySource.mutate(source.id)}
                >
                  Retry source
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkflowProgress({ job, generationActive }) {
  const sourcesFinished = ["SCRAPED", "ANALYZING", "DRAFT", "REVIEW_REQUIRED", "APPROVED", "PUBLISHED"].includes(job.status);
  const draftReady = Boolean(job.latest_product_id);
  const stages = [
    { label: "Sources submitted", state: "complete" },
    {
      label: "Analyze sources",
      state: sourcesFinished ? "complete" : job.status === "FAILED" ? "failed" : "active",
    },
    {
      label: "Generate AI draft",
      state: draftReady ? "complete" : generationActive ? "active" : sourcesFinished ? "next" : "waiting",
    },
    { label: "Review product", state: draftReady ? "active" : "waiting" },
  ];

  const stageClasses = {
    complete: "border-emerald-200 bg-emerald-50",
    active: "border-violet-300 bg-violet-50",
    next: "border-brand-300 bg-brand-50",
    failed: "border-rose-200 bg-rose-50",
    waiting: "border-slate-200 bg-slate-50",
  };
  const numberClasses = {
    complete: "bg-emerald-600 text-white",
    active: "bg-violet-600 text-white",
    next: "bg-brand-700 text-white",
    failed: "bg-rose-600 text-white",
    waiting: "bg-slate-200 text-slate-500",
  };
  const stateLabels = {
    complete: "Complete",
    active: "In progress",
    next: "Action needed",
    failed: "Failed",
    waiting: "Waiting",
  };

  return (
    <section className="panel p-5 sm:p-6" aria-label="Research workflow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Workflow</p>
          <p className="mt-1 text-xs text-slate-600">Follow the product from source collection to review.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">Live status</span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-4">
        {stages.map((stage, index) => (
          <li className={`rounded-xl border p-3 ${stageClasses[stage.state]}`} key={stage.label}>
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${numberClasses[stage.state]}`}>
                {stage.state === "complete" ? "✓" : index + 1}
              </span>
              <span className="text-xs font-bold text-slate-800">{stage.label}</span>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {stateLabels[stage.state]}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({ value, label, tone }) {
  return (
    <div>
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function JobSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-72 rounded-xl bg-slate-200" />
      <div className="panel h-28" />
      <div className="panel h-72" />
    </div>
  );
}

function ErrorPanel({ message }) {
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <h1 className="text-lg font-bold text-ink-950">Research job unavailable</h1>
      <p className="mt-2 text-xs text-slate-500">{message}</p>
      <Link className="mt-5 inline-block text-xs font-bold text-brand-700 hover:underline" to="/research">
        Start a new job
      </Link>
    </div>
  );
}
