import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useToast } from "../components/ToastProvider";
import { aiAdminApi } from "../services/api";

export default function AIProvidersPage() {
  const query = useQuery({ queryKey: ["ai-providers"], queryFn: aiAdminApi.providers });
  if (query.isPending) return <div className="panel h-80 animate-pulse" />;
  if (query.isError) return <div className="panel p-8 text-rose-700">{query.error.userMessage}</div>;
  const active = query.data.flatMap((provider) => provider.models.filter((model) => provider.enabled && model.enabled));
  const selected = active.find((model) => model.is_default) || active.sort((a, b) => a.priority - b.priority)[0];
  return <div className="space-y-6">
    <div><p className="text-sm font-extrabold uppercase tracking-widest text-brand-700">Administration</p><h1 className="mt-2 text-3xl font-black tracking-tight">AI providers and models</h1><p className="mt-2 max-w-3xl text-sm text-ink-500">Configure encrypted provider credentials, test individual models, and choose the generation default. Other enabled models are tried by priority if the selected model fails.</p></div>
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="label">Current generation route</p><p className="font-extrabold">{selected ? selected.display_name : "No usable model configured"}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${selected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{active.length} enabled model{active.length === 1 ? "" : "s"}</span></div>
    <div className="space-y-6">{query.data.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>
  </div>;
}

function ProviderCard({ provider }) {
  const [form, setForm] = useState({ name: provider.name, base_url: provider.base_url, api_key: "", enabled: provider.enabled });
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useToast();
  useEffect(() => setForm((value) => ({ ...value, name: provider.name, base_url: provider.base_url, enabled: provider.enabled, api_key: "" })), [provider]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
  const save = useMutation({ mutationFn: (payload) => aiAdminApi.updateProvider(provider.id, payload), onSuccess: () => { notify(`${provider.name} saved.`); refresh(); }, onError: (error) => notify(error.userMessage, "error") });
  const updateModel = useMutation({ mutationFn: ({ id, payload }) => aiAdminApi.updateModel(id, payload), onSuccess: () => { notify("Model updated."); refresh(); }, onError: (error) => notify(error.userMessage, "error") });
  const removeModel = useMutation({ mutationFn: aiAdminApi.deleteModel, onSuccess: () => { notify("Model removed."); refresh(); }, onError: (error) => notify(error.userMessage, "error") });
  const testModel = useMutation({ mutationFn: aiAdminApi.testModel, onSuccess: (result) => { notify(result.message, result.ok ? "success" : "error"); refresh(); }, onError: (error) => notify(error.userMessage, "error") });
  const payload = { name: form.name, base_url: form.base_url, enabled: form.enabled, ...(form.api_key.trim() ? { api_key: form.api_key.trim() } : {}) };
  return <section className="panel overflow-hidden">
    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${provider.enabled ? "bg-emerald-500" : "bg-slate-300"}`} /><div><h2 className="text-lg font-black">{provider.name}</h2><p className="text-xs text-ink-500">{provider.slug} · {provider.api_key_configured ? `key ${provider.api_key_hint}` : "API key not configured"}</p></div></div><label className="flex items-center gap-2 text-sm font-extrabold"><input checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} type="checkbox" />Enabled</label></div>
    <div className="space-y-6 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_1.2fr_auto]"><Field label="Provider name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label={provider.slug === "agentrouter" ? "Anthropic-compatible base URL" : "OpenAI-compatible base URL"} value={form.base_url} onChange={(value) => setForm({ ...form, base_url: value })} /><Field label={provider.api_key_configured ? "Replace API key" : "API key"} type="password" value={form.api_key} placeholder={provider.api_key_configured ? "Leave blank to keep current key" : "Paste provider key"} onChange={(value) => setForm({ ...form, api_key: value })} /><button className="self-end rounded-xl bg-brand-700 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50" disabled={save.isPending || (form.enabled && !provider.api_key_configured && !form.api_key.trim())} onClick={() => save.mutate(payload)}>{save.isPending ? "Saving…" : "Save provider"}</button></div>
      {provider.slug === "agentrouter" && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">AgentRouter uses its Anthropic-compatible API. Add any model alias available in your AgentRouter dashboard; strict JSON mode is intentionally disabled for broad model compatibility.</p>}
      {provider.last_test_status && <div className={`rounded-xl p-3 text-sm font-bold ${provider.last_test_status === "SUCCESS" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{provider.last_test_message}</div>}
      <div><div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold">Models</h3><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => setAdding(!adding)}>+ Add model</button></div>
        {adding && <NewModelForm providerId={provider.id} providerSlug={provider.slug} onDone={() => { setAdding(false); refresh(); }} />}
        {!provider.models.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-ink-500">No models configured for this provider.</p> : <div className="space-y-3">{provider.models.map((model) => <ModelRow key={model.id} model={model} busy={updateModel.isPending || removeModel.isPending || testModel.isPending} onSave={(payload) => updateModel.mutate({ id: model.id, payload })} onTest={() => testModel.mutate(model.id)} onDelete={() => { if (window.confirm(`Remove ${model.display_name}?`)) removeModel.mutate(model.id); }} />)}</div>}
      </div>
    </div>
  </section>;
}

function NewModelForm({ providerId, providerSlug, onDone }) {
  const [form, setForm] = useState({ model_id: "", display_name: "", priority: 100, supports_json_schema: providerSlug !== "agentrouter", max_tokens: 4096 });
  const { notify } = useToast();
  const create = useMutation({ mutationFn: () => aiAdminApi.createModel(providerId, form), onSuccess: () => { notify("Model added."); onDone(); }, onError: (error) => notify(error.userMessage, "error") });
  return <div className="mb-4 rounded-xl border border-brand-100 bg-brand-100/40 p-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Field label="Provider model ID" value={form.model_id} onChange={(value) => setForm({ ...form, model_id: value })} /><Field label="Display name" value={form.display_name} onChange={(value) => setForm({ ...form, display_name: value })} /><Field label="Priority" type="number" value={form.priority} onChange={(value) => setForm({ ...form, priority: Number(value) })} /><Field label="Maximum output tokens" type="number" value={form.max_tokens} onChange={(value) => setForm({ ...form, max_tokens: Number(value) })} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.supports_json_schema} onChange={(event) => setForm({ ...form, supports_json_schema: event.target.checked })} type="checkbox" />Supports strict JSON schema</label><button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50" disabled={create.isPending || !form.model_id.trim() || !form.display_name.trim()} onClick={() => create.mutate()}>{create.isPending ? "Adding…" : "Add model"}</button></div></div>;
}

function ModelRow({ model, busy, onSave, onTest, onDelete }) {
  const [form, setForm] = useState({ model_id: model.model_id, display_name: model.display_name, enabled: model.enabled, priority: model.priority, supports_json_schema: model.supports_json_schema, max_tokens: model.max_tokens });
  useEffect(() => setForm({ model_id: model.model_id, display_name: model.display_name, enabled: model.enabled, priority: model.priority, supports_json_schema: model.supports_json_schema, max_tokens: model.max_tokens }), [model]);
  return <article className={`rounded-xl border p-4 ${model.is_default ? "border-brand-600 bg-brand-100/30" : "border-slate-200"}`}><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.3fr_1.3fr_.6fr_.7fr]"><Field label="Model ID" value={form.model_id} onChange={(value) => setForm({ ...form, model_id: value })} /><Field label="Display name" value={form.display_name} onChange={(value) => setForm({ ...form, display_name: value })} /><Field label="Priority" type="number" value={form.priority} onChange={(value) => setForm({ ...form, priority: Number(value) })} /><Field label="Max tokens" type="number" value={form.max_tokens} onChange={(value) => setForm({ ...form, max_tokens: Number(value) })} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} type="checkbox" />Enabled</label><label className="flex items-center gap-2 text-sm font-bold"><input checked={form.supports_json_schema} onChange={(event) => setForm({ ...form, supports_json_schema: event.target.checked })} type="checkbox" />Strict JSON</label>{model.is_default && <span className="rounded-full bg-brand-700 px-3 py-1 text-xs font-extrabold text-white">Default</span>}</div><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={busy} onClick={onTest}>Test</button>{!model.is_default && <button className="rounded-lg border border-brand-600 px-3 py-2 text-sm font-bold text-brand-700 disabled:opacity-50" disabled={busy} onClick={() => onSave({ is_default: true })}>Make default</button>}<button className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={busy} onClick={() => onSave(form)}>Save</button><button className="rounded-lg px-3 py-2 text-sm font-bold text-rose-700 disabled:opacity-50" disabled={busy} onClick={onDelete}>Remove</button></div></div></article>;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) { return <label><span className="label">{label}</span><input className="field" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} /></label>; }
