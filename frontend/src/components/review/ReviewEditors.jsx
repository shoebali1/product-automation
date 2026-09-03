import { useState } from "react";

import StatusBadge from "../StatusBadge";

const emptyToNull = (value) => value === "" ? null : value;
const updateAt = (items, index, value) => items.map((item, itemIndex) => itemIndex === index ? value : item);

export default function ReviewTab({ activeTab, conflicts, draft, onChange, onResolve }) {
  const set = (key, value) => onChange({ ...draft, [key]: value });
  switch (activeTab) {
    case "Overview":
      return <OverviewEditor draft={draft} set={set} />;
    case "Highlights":
      return <PairList label="Highlight" items={draft.highlights} keyName="name" valueName="value" onChange={(value) => set("highlights", value)} />;
    case "Description":
      return <DescriptionEditor draft={draft} set={set} />;
    case "Specifications":
      return <ObjectEditor label="Specification" value={draft.specifications} onChange={(value) => set("specifications", value)} />;
    case "Images":
      return <ImagesEditor items={draft.images} onChange={(value) => set("images", value)} />;
    case "Variations":
      return <VariationsEditor items={draft.variations} onChange={(value) => set("variations", value)} />;
    case "Packs":
      return <PacksEditor items={draft.packs} onChange={(value) => set("packs", value)} />;
    case "Pricing":
      return <PricingEditor value={draft.pricing} onChange={(value) => set("pricing", value)} />;
    case "SEO":
      return <SeoEditor value={draft.seo} onChange={(value) => set("seo", value)} />;
    case "Sources":
      return <SourcesPanel value={draft.source_evidence} />;
    case "Conflicts":
      return <ConflictPanel conflicts={conflicts} onResolve={onResolve} />;
    case "Raw JSON Output":
      return <RawJsonPanel draft={draft} />;
    default:
      return null;
  }
}

function OverviewEditor({ draft, set }) {
  const fields = [
    ["product_title", "Product title"], ["business_product_title", "Business title"],
    ["slug", "Slug"], ["brand", "Brand"], ["manufacturer", "Manufacturer"],
    ["generic_name", "Generic name"], ["product_code", "Product code"],
    ["sku", "SKU"], ["gtin", "GTIN"], ["category", "Category"],
  ];
  return <div className="grid gap-5 md:grid-cols-2">{fields.map(([key, label]) => <TextField key={key} label={label} value={draft[key] || ""} onChange={(value) => set(key, ["product_title", "business_product_title", "slug"].includes(key) ? value : emptyToNull(value))} />)}</div>;
}

function DescriptionEditor({ draft, set }) {
  return <div className="space-y-7">
    <TextArea label="Short description" rows={3} value={draft.short_description} onChange={(value) => set("short_description", value)} />
    <TextArea label="Full description" rows={10} value={draft.description} onChange={(value) => set("description", value)} />
    <StringList label="Benefits" items={draft.benefits} onChange={(value) => set("benefits", value)} />
    <StringList label="How to use" items={draft.how_to_use} onChange={(value) => set("how_to_use", value)} />
    <StringList label="Precautions" items={draft.precautions} onChange={(value) => set("precautions", value)} />
  </div>;
}

function ImagesEditor({ items, onChange }) {
  const add = () => onChange([...items, { url: "", source_url: null, alt: null, primary_candidate: false, reference_only: true }]);
  return <Collection title="Product images" addLabel="Add image" onAdd={add} empty={!items.length}>
    {items.map((item, index) => <Card key={index} title={`Image ${index + 1}`} onRemove={() => onChange(items.filter((_, i) => i !== index))}>
      <div className="grid gap-4 md:grid-cols-[9rem_1fr]">
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{item.url ? <img alt={item.alt || "Product reference"} className="h-full w-full object-contain" src={item.url} /> : <span className="text-xs text-ink-500">No preview</span>}</div>
        <div className="space-y-4">
          <TextField label="Image URL" value={item.url} onChange={(value) => onChange(updateAt(items, index, { ...item, url: value }))} />
          <TextField label="Alt text" value={item.alt || ""} onChange={(value) => onChange(updateAt(items, index, { ...item, alt: emptyToNull(value) }))} />
          <div className="flex flex-wrap gap-5"><Checkbox label="Primary candidate" checked={item.primary_candidate} onChange={(value) => onChange(updateAt(items, index, { ...item, primary_candidate: value }))} /><Checkbox label="Reference only" checked={item.reference_only} onChange={(value) => onChange(updateAt(items, index, { ...item, reference_only: value }))} /></div>
        </div>
      </div>
    </Card>)}
  </Collection>;
}

function VariationsEditor({ items, onChange }) {
  return <Collection title="Variations" addLabel="Add variation" empty={!items.length} onAdd={() => onChange([...items, { name: "", price: null, mrp: null, sku: null, attributes: {} }])}>
    {items.map((item, index) => <Card key={index} title={`Variation ${index + 1}`} onRemove={() => onChange(items.filter((_, i) => i !== index))}>
      <div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item.name} onChange={(value) => onChange(updateAt(items, index, { ...item, name: value }))} /><TextField label="SKU" value={item.sku || ""} onChange={(value) => onChange(updateAt(items, index, { ...item, sku: emptyToNull(value) }))} /><NumberField label="Price" value={item.price} onChange={(value) => onChange(updateAt(items, index, { ...item, price: value }))} /><NumberField label="MRP" value={item.mrp} onChange={(value) => onChange(updateAt(items, index, { ...item, mrp: value }))} /></div>
      <div className="mt-5"><ObjectEditor label="Attribute" value={item.attributes} onChange={(value) => onChange(updateAt(items, index, { ...item, attributes: value }))} /></div>
    </Card>)}
  </Collection>;
}

function PacksEditor({ items, onChange }) {
  return <Collection title="Packs" addLabel="Add pack" empty={!items.length} onAdd={() => onChange([...items, { label: "", quantity: null, price: null, mrp: null, sku: null }])}>
    {items.map((item, index) => <Card key={index} title={`Pack ${index + 1}`} onRemove={() => onChange(items.filter((_, i) => i !== index))}>
      <div className="grid gap-4 md:grid-cols-2"><TextField label="Label" value={item.label} onChange={(value) => onChange(updateAt(items, index, { ...item, label: value }))} /><TextField label="SKU" value={item.sku || ""} onChange={(value) => onChange(updateAt(items, index, { ...item, sku: emptyToNull(value) }))} /><NumberField label="Quantity" step="1" value={item.quantity} onChange={(value) => onChange(updateAt(items, index, { ...item, quantity: value }))} /><NumberField label="Price" value={item.price} onChange={(value) => onChange(updateAt(items, index, { ...item, price: value }))} /><NumberField label="MRP" value={item.mrp} onChange={(value) => onChange(updateAt(items, index, { ...item, mrp: value }))} /></div>
    </Card>)}
  </Collection>;
}

function PricingEditor({ value, onChange }) {
  return <div className="grid gap-5 md:grid-cols-2"><NumberField label="MRP" value={value.mrp} onChange={(item) => onChange({ ...value, mrp: item })} /><NumberField label="Sale price" value={value.sale_price} onChange={(item) => onChange({ ...value, sale_price: item })} /><TextField label="Currency (ISO code)" value={value.currency || ""} onChange={(item) => onChange({ ...value, currency: emptyToNull(item.toUpperCase()) })} /><NumberField label="GST" value={value.gst} onChange={(item) => onChange({ ...value, gst: item })} /></div>;
}

function SeoEditor({ value, onChange }) {
  return <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><TextField label="Meta title" value={value.meta_title} onChange={(item) => onChange({ ...value, meta_title: item })} /><TextField label="Canonical link" value={value.canonical_link || ""} onChange={(item) => onChange({ ...value, canonical_link: emptyToNull(item) })} /><TextArea label="Meta description" rows={4} value={value.meta_description} onChange={(item) => onChange({ ...value, meta_description: item })} /><TextField label="Business meta title" value={value.business_meta_title} onChange={(item) => onChange({ ...value, business_meta_title: item })} /><TextArea label="Business meta description" rows={4} value={value.business_meta_description} onChange={(item) => onChange({ ...value, business_meta_description: item })} /><TextField label="Business canonical link" value={value.business_canonical_link || ""} onChange={(item) => onChange({ ...value, business_canonical_link: emptyToNull(item) })} /></div><StringList label="Meta keywords" items={value.meta_keywords} onChange={(item) => onChange({ ...value, meta_keywords: item })} /></div>;
}

function SourcesPanel({ value }) {
  const entries = Object.entries(value || {});
  if (!entries.length) return <Empty>No source evidence was recorded.</Empty>;
  return <div className="space-y-4"><p className="text-sm text-ink-500">Verified evidence is read-only. Edit the corresponding product field and provide a manual evidence note when overriding it.</p>{entries.map(([field, evidence]) => <article className="rounded-xl border border-slate-200 p-5" key={field}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-extrabold">{field}</h3>{evidence && typeof evidence === "object" && evidence.confidence_score != null && <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">{evidence.confidence} · {Math.round(Number(evidence.confidence_score) * 100)}% support</span>}</div><pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{JSON.stringify(evidence, null, 2)}</pre></article>)}</div>;
}

function ConflictPanel({ conflicts, onResolve }) {
  const [manual, setManual] = useState({});
  const open = conflicts.filter((item) => item.status === "OPEN");
  if (!conflicts.length) return <Empty>No conflicts were detected.</Empty>;
  return <div className="space-y-5">{conflicts.map((conflict) => {
    const form = manual[conflict.id] || { visible: false, value: "", note: "" };
    return <article className="rounded-xl border border-slate-200 p-5" key={conflict.id}><div className="flex items-center justify-between gap-3"><h3 className="font-extrabold">{conflict.field_path}</h3><StatusBadge status={conflict.status} /></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{conflict.values.map((candidate, index) => <button className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-600 hover:bg-brand-100 disabled:opacity-50" disabled={conflict.status !== "OPEN"} key={`${conflict.id}-${index}`} onClick={() => onResolve(conflict.id, { action: "ACCEPT_VALUE", value: candidate.value })}><p className="break-words font-bold">{formatValue(candidate.value)}</p><p className="mt-1 text-xs text-ink-500">Accept · {candidate.source_ids?.length || 0} supporting source(s)</p></button>)}</div>
      {conflict.status === "OPEN" && <div className="mt-4 flex flex-wrap gap-3"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => setManual({ ...manual, [conflict.id]: { ...form, visible: !form.visible } })}>Enter manually</button><button className="rounded-lg px-3 py-2 text-sm font-bold text-ink-500 hover:bg-slate-100" onClick={() => onResolve(conflict.id, { action: "IGNORE", note: "Ignored during human review" })}>Ignore conflict</button></div>}
      {form.visible && conflict.status === "OPEN" && <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4"><TextArea label="Manual value (plain text or JSON)" rows={3} value={form.value} onChange={(value) => setManual({ ...manual, [conflict.id]: { ...form, value } })} /><TextArea label="Reason / evidence note" rows={2} value={form.note} onChange={(note) => setManual({ ...manual, [conflict.id]: { ...form, note } })} /><button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50" disabled={!form.value.trim() || !form.note.trim()} onClick={() => onResolve(conflict.id, { action: "ENTER_MANUALLY", value: parseValue(form.value), note: form.note.trim() })}>Use manual value</button></div>}
    </article>;
  })}{!open.length && <p className="text-sm font-bold text-emerald-700">All conflicts are resolved.</p>}</div>;
}

function PairList({ label, items, keyName, valueName, onChange }) {
  return <Collection title={`${label}s`} addLabel={`Add ${label.toLowerCase()}`} empty={!items.length} onAdd={() => onChange([...items, { [keyName]: "", [valueName]: "" }])}>{items.map((item, index) => <Card key={index} title={`${label} ${index + 1}`} onRemove={() => onChange(items.filter((_, i) => i !== index))}><div className="grid gap-4 md:grid-cols-2"><TextField label="Name" value={item[keyName]} onChange={(value) => onChange(updateAt(items, index, { ...item, [keyName]: value }))} /><TextField label="Value" value={item[valueName]} onChange={(value) => onChange(updateAt(items, index, { ...item, [valueName]: value }))} /></div></Card>)}</Collection>;
}

function StringList({ label, items, onChange }) {
  return <Collection title={label} addLabel="Add item" empty={!items.length} onAdd={() => onChange([...items, ""])}>{items.map((item, index) => <div className="flex gap-2" key={index}><input className="field" value={item} onChange={(event) => onChange(updateAt(items, index, event.target.value))} /><RemoveButton onClick={() => onChange(items.filter((_, i) => i !== index))} /></div>)}</Collection>;
}

function ObjectEditor({ label, value, onChange }) {
  const entries = Object.entries(value || {});
  return <Collection title={`${label}s`} addLabel={`Add ${label.toLowerCase()}`} empty={!entries.length} onAdd={() => onChange({ ...value, "": "" })}>{entries.map(([key, item], index) => <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" key={`${key}-${index}`}><input aria-label={`${label} name`} className="field" placeholder="Name" value={key} onChange={(event) => { const next = Object.fromEntries(entries.map(([entryKey, entryValue], i) => i === index ? [event.target.value, entryValue] : [entryKey, entryValue])); onChange(next); }} /><input aria-label={`${label} value`} className="field" placeholder="Value" value={item} onChange={(event) => onChange({ ...value, [key]: event.target.value })} /><RemoveButton onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))} /></div>)}</Collection>;
}

function Collection({ title, addLabel, onAdd, empty, children }) { return <section><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-extrabold">{title}</h3><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50" onClick={onAdd}>+ {addLabel}</button></div>{empty ? <Empty>No entries yet.</Empty> : <div className="space-y-4">{children}</div>}</section>; }
function Card({ title, onRemove, children }) { return <article className="rounded-xl border border-slate-200 p-4"><div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-extrabold">{title}</h4><RemoveButton onClick={onRemove} /></div>{children}</article>; }
function RemoveButton({ onClick }) { return <button aria-label="Remove" className="rounded-lg px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50" onClick={onClick}>Remove</button>; }
function TextField({ label, value, onChange }) { return <label><span className="label">{label}</span><input className="field" onChange={(event) => onChange(event.target.value)} value={value ?? ""} /></label>; }
function TextArea({ label, value, onChange, rows }) { return <label className="block"><span className="label">{label}</span><textarea className="field resize-y" onChange={(event) => onChange(event.target.value)} rows={rows} value={value ?? ""} /></label>; }
function NumberField({ label, value, onChange, step = "0.01" }) { return <label><span className="label">{label}</span><input className="field" min="0" onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)} step={step} type="number" value={value ?? ""} /></label>; }
function Checkbox({ label, checked, onChange }) { return <label className="flex items-center gap-2 text-sm font-bold"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>; }
function Empty({ children }) { return <p className="rounded-xl bg-slate-50 p-4 text-sm text-ink-500">{children}</p>; }
function formatValue(value) { return typeof value === "string" ? value : JSON.stringify(value); }
function parseValue(value) { try { return JSON.parse(value); } catch { return value; } }

function RawJsonPanel({ draft }) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(draft, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-ink-950">Final Product Output Data (JSON)</h3>
          <p className="text-xs text-ink-500">
            Consolidated, multi-source validated product record produced by AI generation.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-slate-50 transition-colors"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "✓ Copied to clipboard!" : "Copy Full JSON"}
        </button>
      </div>
      <pre className="max-h-[600px] overflow-auto rounded-xl bg-slate-900 p-5 font-mono text-xs leading-5 text-emerald-400">
        {jsonString}
      </pre>
    </div>
  );
}
