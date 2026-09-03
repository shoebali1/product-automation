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
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 max-w-3xl">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600">New research job</p>
        <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">Build one product record from multiple sources.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-700">
          Add product pages for the same item. The system extracts facts, compares evidence, flags disagreements, and prepares a reviewable draft.
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-ink-950">Product source URLs</h2>
              <p className="mt-1 text-sm text-ink-500">1 required · 4–5 recommended · 10 maximum</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-700 shadow-sm">{cleanedUrls.length}/10 added</span>
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-7">
          {urls.map((url, index) => (
            <div className="flex items-start gap-3" key={index}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-sm font-extrabold text-brand-700">{index + 1}</div>
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`url-${index}`}>Product URL {index + 1}</label>
                <input
                  className={`field ${url && !isValidHttpUrl(url.trim()) ? "border-rose-400" : ""}`}
                  id={`url-${index}`}
                  onChange={(event) => updateUrl(index, event.target.value)}
                  placeholder="https://store.example.com/product/..."
                  type="url"
                  value={url}
                />
                {url && !isValidHttpUrl(url.trim()) && <p className="mt-1 text-xs font-semibold text-rose-600">Enter a complete HTTP or HTTPS URL.</p>}
              </div>
              {urls.length > 1 && (
                <button className="mt-1 rounded-lg px-2 py-2 text-sm font-bold text-ink-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeUrl(index)} type="button">
                  Remove
                </button>
              )}
            </div>
          ))}
          {urls.length < 10 && (
            <button className="rounded-xl border border-dashed border-brand-600/40 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-100" onClick={() => setUrls((items) => [...items, ""])} type="button">
              + Add another source
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-sm text-ink-500">Duplicate and tracking-only URLs are removed automatically.</p>
          <button
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
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
