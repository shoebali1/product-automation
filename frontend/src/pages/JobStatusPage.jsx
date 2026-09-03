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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link className="text-sm font-bold text-brand-700 hover:underline" to="/research">← New research</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-ink-950">Research progress</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-2 font-mono text-xs text-ink-500">Job {job.id}</p>
        </div>
        <div className="flex gap-3">
          {(job.status === "SCRAPED" || isGenerating || job.status === "ANALYZING") && !job.latest_product_id && (
            <button
              className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-600 disabled:opacity-50"
              disabled={generate.isPending || isGenerating || job.status === "ANALYZING"}
              onClick={() => generate.mutate()}
            >
              {generate.isPending || isGenerating || job.status === "ANALYZING"
                ? "Generating with AI…"
                : "Generate draft"}
            </button>
          )}
          {job.latest_product_id && (
            <Link className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-600 shadow" to={`/products/${job.latest_product_id}`}>Review draft</Link>
          )}
        </div>
      </div>

      {job.error_summary && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{job.error_summary}</div>}

      {(job.status === "ANALYZING" || isGenerating) && !job.latest_product_id && (
        <div className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-violet-50/90 p-5 text-violet-950 shadow-sm">
          <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <div>
            <p className="font-extrabold text-sm">AI generation in progress…</p>
            <p className="mt-0.5 text-xs text-violet-800">Synthesizing product data from scraped sources and generating final catalog output. This page updates automatically.</p>
          </div>
        </div>
      )}

      {job.latest_product_id && (
        <section className="rounded-2xl border-2 border-brand-500 bg-gradient-to-r from-brand-50 via-white to-brand-50/50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <h2 className="text-lg font-black text-ink-950">Final Product Output Ready</h2>
              </div>
              <p className="text-sm text-ink-700">
                AI has successfully synthesized and structured the final product data across all verified sources.
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-extrabold text-white shadow hover:bg-brand-600 transition-colors"
              to={`/products/${job.latest_product_id}`}
            >
              <span>View Final Product & Output</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      <section className="panel p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-bold"><span>{completed} of {job.total_urls} sources finished</span><span>{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="flex gap-5 text-sm"><Metric value={job.successful_urls} label="Successful" tone="text-emerald-700" /><Metric value={job.failed_urls} label="Failed" tone="text-rose-700" /></div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-7"><h2 className="font-extrabold">Source processing</h2></div>
        <div className="divide-y divide-slate-100">
          {job.sources.map((source) => (
            <article className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7" key={source.id}>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={source.status} /><span className="text-xs font-bold text-ink-500">Attempt {source.attempts}</span></div>
                <p className="truncate text-sm font-extrabold text-ink-950">{source.domain}</p>
                <a className="block truncate text-xs text-ink-500 hover:text-brand-700 hover:underline" href={source.url} rel="noreferrer" target="_blank">{source.url}</a>
                {source.error && <p className="mt-2 text-sm font-semibold text-rose-700">{source.error}</p>}
              </div>
              {source.status === "FAILED" && (
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50" disabled={retrySource.isPending} onClick={() => retrySource.mutate(source.id)}>Retry source</button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label, tone }) { return <div><p className={`text-2xl font-black ${tone}`}>{value}</p><p className="text-xs font-bold text-ink-500">{label}</p></div>; }
function JobSkeleton() { return <div className="space-y-5 animate-pulse"><div className="h-10 w-72 rounded bg-slate-200" /><div className="panel h-32" /><div className="panel h-80" /></div>; }
function ErrorPanel({ message }) { return <div className="panel mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-black">Research job unavailable</h1><p className="mt-2 text-ink-700">{message}</p><Link className="mt-5 inline-block font-bold text-brand-700" to="/research">Start a new job</Link></div>; }
