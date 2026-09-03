import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { useToast } from "../components/ToastProvider";
import { researchApi } from "../services/api";

const isValidHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export default function ProductResearchPage() {
  const [urls, setUrls] = useState(["", "", "", ""]);
  const navigate = useNavigate();
  const { notify } = useToast();
  const cleanedUrls = useMemo(() => urls.map((url) => url.trim()).filter(Boolean), [urls]);
  const invalidCount = cleanedUrls.filter((url) => !isValidHttpUrl(url)).length;

  const createJob = useMutation({
    mutationFn: () => researchApi.createJob(cleanedUrls),
    onSuccess: (job) => {
      notify(`Research job created with ${job.unique_urls} unique source${job.unique_urls === 1 ? "" : "s"}.`);
      navigate(`/research/jobs/${job.job_id}`);
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const updateUrl = (index, value) => setUrls((items) => items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  const removeUrl = (index) => setUrls((items) => items.filter((_, itemIndex) => itemIndex !== index));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">New research job</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          Build one product record from multiple sources
        </h1>
        <p className="mt-2 text-xs text-slate-500 max-w-2xl leading-relaxed">
          Add product page URLs for the same item. The system automatically scrapes facts, compares multi-source evidence, flags disagreements, and synthesizes an admin-ready draft.
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink-950">Product source URLs</h2>
              <p className="text-[11px] text-slate-500">1 required · 4–5 recommended · 10 maximum</p>
            </div>
            <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs">
              {cleanedUrls.length}/10 added
            </span>
          </div>
        </div>
        <div className="space-y-3.5 p-6">
          {urls.map((url, index) => (
            <div className="flex items-start gap-3" key={index}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-xs font-black text-brand-700">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`url-${index}`}>Product URL {index + 1}</label>
                <input
                  className={`field text-xs ${url && !isValidHttpUrl(url.trim()) ? "border-rose-400 bg-rose-50/20" : ""}`}
                  id={`url-${index}`}
                  onChange={(event) => updateUrl(index, event.target.value)}
                  placeholder="https://store.example.com/product/..."
                  type="url"
                  value={url}
                />
                {url && !isValidHttpUrl(url.trim()) && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">Enter a complete HTTP or HTTPS URL.</p>
                )}
              </div>
              {urls.length > 1 && (
                <button
                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  onClick={() => removeUrl(index)}
                  title="Remove source"
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {urls.length < 10 && (
            <button
              className="rounded-xl border border-dashed border-brand-300 bg-brand-50/30 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
              onClick={() => setUrls((items) => [...items, ""])}
              type="button"
            >
              + Add another source
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Duplicate and tracking-only parameters are removed automatically.</p>
          <button
            className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-xs font-black text-white shadow-xs hover:from-brand-700 hover:to-brand-800 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
            disabled={!cleanedUrls.length || invalidCount > 0 || createJob.isPending}
            onClick={() => createJob.mutate()}
            type="button"
          >
            {createJob.isPending ? "Creating research job…" : "Analyze product"}
          </button>
        </div>
      </section>
    </div>
  );
}
