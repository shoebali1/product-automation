import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useToast } from "../components/ToastProvider";
import { aiAdminApi } from "../services/api";

export default function AIProvidersPage() {
  const query = useQuery({ queryKey: ["ai-providers"], queryFn: aiAdminApi.providers });

  if (query.isPending) return <div className="panel h-80 animate-pulse bg-white/60" />;
  if (query.isError) return <div className="panel p-8 font-bold text-rose-700">{query.error.userMessage}</div>;

  const active = query.data.flatMap((provider) => provider.models.filter((model) => provider.enabled && model.enabled));
  const selected = active.find((model) => model.is_default) || active.sort((a, b) => a.priority - b.priority)[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-black uppercase tracking-widest text-brand-700">Administration</p>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-xs font-semibold text-slate-500">Routing & Credentials</span>
        </div>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight text-ink-950">AI Providers & Models</h1>
        <p className="mt-2 max-w-3xl text-xs text-slate-500 leading-relaxed">
          Configure encrypted provider credentials, test individual models, and choose the generation default. Other enabled models are tried by priority if the selected model fails.
        </p>
      </div>

      {/* Current Generation Route Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-white to-brand-50/30 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100 shadow-xs">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Generation Route</p>
            <p className="text-base font-black text-ink-950">{selected ? selected.display_name : "No usable model configured"}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
            selected ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${selected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {active.length} enabled model{active.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Clearly Separated Providers List */}
      <div className="space-y-8">
        {query.data.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ provider }) {
  const [form, setForm] = useState({
    name: provider.name,
    base_url: provider.base_url,
    api_key: "",
    enabled: provider.enabled,
  });
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useToast();

  useEffect(() => {
    setForm({
      name: provider.name,
      base_url: provider.base_url,
      enabled: provider.enabled,
      api_key: "",
    });
  }, [provider]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-providers"] });

  const save = useMutation({
    mutationFn: (payload) => aiAdminApi.updateProvider(provider.id, payload),
    onSuccess: () => {
      notify(`${provider.name} saved.`);
      refresh();
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const updateModel = useMutation({
    mutationFn: ({ id, payload }) => aiAdminApi.updateModel(id, payload),
    onSuccess: () => {
      notify("Model updated.");
      refresh();
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const removeModel = useMutation({
    mutationFn: aiAdminApi.deleteModel,
    onSuccess: () => {
      notify("Model removed.");
      refresh();
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const testModel = useMutation({
    mutationFn: aiAdminApi.testModel,
    onSuccess: (result) => {
      notify(result.message, result.ok ? "success" : "error");
      refresh();
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  const payload = {
    name: form.name,
    base_url: form.base_url,
    enabled: form.enabled,
    ...(form.api_key.trim() ? { api_key: form.api_key.trim() } : {}),
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all">
      {/* Provider Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 bg-slate-50/70 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-xs font-black text-ink-950 text-sm">
            {provider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-black text-ink-950">{provider.name}</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                provider.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${provider.enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                {provider.enabled ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {provider.slug} ·{" "}
              {provider.api_key_configured ? (
                <span className="font-sans text-emerald-700 font-semibold">Configured ({provider.api_key_hint})</span>
              ) : (
                <span className="font-sans text-amber-700 font-semibold">API key missing</span>
              )}
            </p>
          </div>
        </div>

        {/* Enabled Checkbox */}
        <label className="flex items-center gap-2.5 text-xs font-bold text-ink-950 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <input
            checked={form.enabled}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            type="checkbox"
          />
          <span>Enable Provider</span>
        </label>
      </div>

      {/* Provider Details & Settings */}
      <div className="space-y-6 p-5 sm:p-7">
        {/* Settings Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1.2fr_auto]">
          <Field
            label="Provider name"
            onChange={(value) => setForm({ ...form, name: value })}
            value={form.name}
          />
          <Field
            label={provider.slug === "agentrouter" ? "Anthropic-compatible base URL" : "OpenAI-compatible base URL"}
            onChange={(value) => setForm({ ...form, base_url: value })}
            value={form.base_url}
          />
          <Field
            label={provider.api_key_configured ? "Replace API key" : "API key"}
            onChange={(value) => setForm({ ...form, api_key: value })}
            placeholder={provider.api_key_configured ? "Leave blank to keep current key" : "Paste provider key"}
            type="password"
            value={form.api_key}
          />
          <div className="flex flex-col justify-end">
            <button
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 transition-all cursor-pointer h-[38px]"
              disabled={save.isPending || (form.enabled && !provider.api_key_configured && !form.api_key.trim())}
              onClick={() => save.mutate(payload)}
              type="button"
            >
              {save.isPending ? "Saving…" : "Save provider"}
            </button>
          </div>
        </div>

        {provider.slug === "agentrouter" && (
          <p className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed">
            AgentRouter uses its Anthropic-compatible API. Add any model alias available in your AgentRouter dashboard; strict JSON mode is intentionally disabled for broad model compatibility.
          </p>
        )}

        {provider.last_test_status && (
          <div
            className={`rounded-xl border p-3 text-xs font-bold ${
              provider.last_test_status === "SUCCESS"
                ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                : "border-rose-200 bg-rose-50/60 text-rose-800"
            }`}
          >
            {provider.last_test_message}
          </div>
        )}

        {/* Separated Models Section */}
        <div className="border-t border-slate-100 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Configured Models</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {provider.models.length}
              </span>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => setAdding(!adding)}
              type="button"
            >
              <span>{adding ? "✕ Cancel" : "+ Add model"}</span>
            </button>
          </div>

          {adding && (
            <NewModelForm
              onDone={() => {
                setAdding(false);
                refresh();
              }}
              providerId={provider.id}
              providerSlug={provider.slug}
            />
          )}

          {!provider.models.length ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-xs font-medium text-slate-400">
              No models configured for this provider. Click "+ Add model" above to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {provider.models.map((model) => (
                <ModelRow
                  busy={updateModel.isPending || removeModel.isPending || testModel.isPending}
                  key={model.id}
                  model={model}
                  onDelete={() => {
                    if (window.confirm(`Remove ${model.display_name}?`)) removeModel.mutate(model.id);
                  }}
                  onSave={(mPayload) => updateModel.mutate({ id: model.id, payload: mPayload })}
                  onTest={() => testModel.mutate(model.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function NewModelForm({ providerId, providerSlug, onDone }) {
  const [form, setForm] = useState({
    model_id: "",
    display_name: "",
    priority: 100,
    supports_json_schema: providerSlug !== "agentrouter",
    max_tokens: 4096,
  });
  const { notify } = useToast();
  const create = useMutation({
    mutationFn: () => aiAdminApi.createModel(providerId, form),
    onSuccess: () => {
      notify("Model added.");
      onDone();
    },
    onError: (error) => notify(error.userMessage, "error"),
  });

  return (
    <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4 shadow-xs">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Provider model ID" onChange={(value) => setForm({ ...form, model_id: value })} value={form.model_id} />
        <Field label="Display name" onChange={(value) => setForm({ ...form, display_name: value })} value={form.display_name} />
        <Field label="Priority" onChange={(value) => setForm({ ...form, priority: Number(value) })} type="number" value={form.priority} />
        <Field label="Maximum output tokens" onChange={(value) => setForm({ ...form, max_tokens: Number(value) })} type="number" value={form.max_tokens} />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-brand-100">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            checked={form.supports_json_schema}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            onChange={(event) => setForm({ ...form, supports_json_schema: event.target.checked })}
            type="checkbox"
          />
          Supports strict JSON schema
        </label>
        <button
          className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-black text-white hover:bg-brand-800 disabled:opacity-50 transition-colors cursor-pointer"
          disabled={create.isPending || !form.model_id.trim() || !form.display_name.trim()}
          onClick={() => create.mutate()}
          type="button"
        >
          {create.isPending ? "Adding…" : "Add model"}
        </button>
      </div>
    </div>
  );
}

function ModelRow({ model, busy, onSave, onTest, onDelete }) {
  const [form, setForm] = useState({
    model_id: model.model_id,
    display_name: model.display_name,
    enabled: model.enabled,
    priority: model.priority,
    supports_json_schema: model.supports_json_schema,
    max_tokens: model.max_tokens,
  });

  useEffect(() => {
    setForm({
      model_id: model.model_id,
      display_name: model.display_name,
      enabled: model.enabled,
      priority: model.priority,
      supports_json_schema: model.supports_json_schema,
      max_tokens: model.max_tokens,
    });
  }, [model]);

  return (
    <article
      className={`rounded-xl border p-4 transition-all ${
        model.is_default ? "border-brand-300 bg-brand-50/20 shadow-xs ring-1 ring-brand-300/50" : "border-slate-200 bg-slate-50/40 hover:bg-white"
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.3fr_0.6fr_0.7fr]">
        <Field label="Model ID" onChange={(value) => setForm({ ...form, model_id: value })} value={form.model_id} />
        <Field label="Display name" onChange={(value) => setForm({ ...form, display_name: value })} value={form.display_name} />
        <Field label="Priority" onChange={(value) => setForm({ ...form, priority: Number(value) })} type="number" value={form.priority} />
        <Field label="Max tokens" onChange={(value) => setForm({ ...form, max_tokens: Number(value) })} type="number" value={form.max_tokens} />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              checked={form.enabled}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              type="checkbox"
            />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              checked={form.supports_json_schema}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={(event) => setForm({ ...form, supports_json_schema: event.target.checked })}
              type="checkbox"
            />
            Strict JSON
          </label>
          {model.is_default && (
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              Default
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            disabled={busy}
            onClick={onTest}
            type="button"
          >
            Test
          </button>
          {!model.is_default && (
            <button
              className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              disabled={busy}
              onClick={() => onSave({ is_default: true })}
              type="button"
            >
              Make default
            </button>
          )}
          <button
            className="rounded-lg bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-800 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            disabled={busy}
            onClick={() => onSave(form)}
            type="button"
          >
            Save
          </button>

          {/* Delete Icon Button replacing Remove text */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={onDelete}
            title="Delete model"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input
        className="field text-xs font-medium"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}
