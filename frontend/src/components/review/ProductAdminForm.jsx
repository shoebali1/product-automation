import { useMemo, useState } from "react";
import RichEditor from "../RichEditor";

export default function ProductAdminForm({ draft, onChange, locked }) {
  const [detailsTab, setDetailsTab] = useState("Pricing"); // "Pricing" | "Restock" | "SEO"

  const setField = (key, value) => {
    onChange({ ...draft, [key]: value });
  };

  const setNested = (parent, key, value) => {
    onChange({
      ...draft,
      [parent]: {
        ...(draft[parent] || {}),
        [key]: value,
      },
    });
  };

  // Format highlights to HTML string if array or string
  const highlightsHtml = useMemo(() => {
    if (typeof draft.highlights === "string") return draft.highlights;
    if (Array.isArray(draft.highlights)) {
      const items = draft.highlights
        .map((h) => {
          if (typeof h === "object" && h !== null) {
            return h.name ? `<strong>${h.name}:</strong> ${h.value || ""}` : (h.value || "");
          }
          return String(h);
        })
        .filter(Boolean);
      return items.length ? `<ul>${items.map((it) => `<li>${it}</li>`).join("")}</ul>` : "";
    }
    return "";
  }, [draft.highlights]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Image helpers
  const images = draft.images || [];
  const addImage = () => {
    const newImages = [
      ...images,
      {
        url: "",
        title: "",
        alt: "",
        primary_candidate: images.length === 0,
        reference_only: true,
      },
    ];
    onChange({ ...draft, images: newImages });
    setActiveImageIndex(newImages.length - 1);
  };

  const updateImage = (index, field, value) => {
    const updated = images.map((img, i) => {
      if (i === index) {
        return { ...img, [field]: value };
      }
      return img;
    });
    onChange({ ...draft, images: updated });
  };

  const setPrimaryImage = (index) => {
    const updated = images.map((img, i) => ({
      ...img,
      primary_candidate: i === index,
    }));
    onChange({ ...draft, images: updated });
    setActiveImageIndex(index);
  };

  const removeImage = (index) => {
    const next = images.filter((_, i) => i !== index);
    onChange({ ...draft, images: next });
    if (activeImageIndex >= next.length) {
      setActiveImageIndex(Math.max(0, next.length - 1));
    }
  };

  // Variations helpers
  const variations = draft.variations || [];
  const addVariation = () => {
    onChange({
      ...draft,
      variations: [
        ...variations,
        { name: "", price: null, mrp: null, sku: null, attributes: {} },
      ],
    });
  };

  const updateVariation = (index, field, value) => {
    const updated = variations.map((v, i) => (i === index ? { ...v, [field]: value } : v));
    onChange({ ...draft, variations: updated });
  };

  const removeVariation = (index) => {
    onChange({
      ...draft,
      variations: variations.filter((_, i) => i !== index),
    });
  };

  // Packs helpers
  const packs = draft.packs || [];
  const addPack = () => {
    onChange({
      ...draft,
      packs: [
        ...packs,
        { label: "", quantity: null, price: null, mrp: null, sku: null },
      ],
    });
  };

  const updatePack = (index, field, value) => {
    const updated = packs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    onChange({ ...draft, packs: updated });
  };

  const removePack = (index) => {
    onChange({
      ...draft,
      packs: packs.filter((_, i) => i !== index),
    });
  };

  const wordCount = (str) => (str ? str.trim().split(/\s+/).filter(Boolean).length : 0);
  const charCount = (str) => (str ? str.length : 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT COLUMN: Main Form Fields (2 Cols) */}
      <div className="space-y-6 lg:col-span-2">
        {/* PRODUCT TITLE */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Product Title <span className="text-rose-500">*</span>
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-ink-950 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-500/15 transition-all"
            disabled={locked}
            onChange={(e) => setField("product_title", e.target.value)}
            placeholder="e.g. Surgical Gloves Medium — Box of 100"
            value={draft.product_title || ""}
          />
        </div>

        {/* BUSINESS PRODUCT TITLE */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Business Product Title
            </label>
            <span className="text-[11px] text-slate-400">Internal / B2B listing title</span>
          </div>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-ink-950 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-500/15 transition-all"
            disabled={locked}
            onChange={(e) => setField("business_product_title", e.target.value)}
            placeholder="e.g. Surgical Gloves Medium — Box of 100"
            value={draft.business_product_title || ""}
          />
        </div>

        {/* IMAGES */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              IMAGES
            </h3>
          </div>

          <p className="mt-3 text-xs text-slate-600 flex items-center gap-1.5">
            <span>Click the</span>
            <span className="text-amber-500 text-sm">⭐</span>
            <span>icon on any image to set it as the primary product image.</span>
          </p>

          <div className="mt-4 flex flex-wrap items-start gap-4">
            {images.map((img, index) => {
              const isPrimary = Boolean(img.primary_candidate);
              const isSelected = activeImageIndex === index;
              return (
                <div
                  className={`group relative h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 transition-all ${
                    isPrimary
                      ? "border-blue-500 ring-2 ring-blue-400/30"
                      : isSelected
                      ? "border-brand-500 ring-2 ring-brand-400/20"
                      : "border-slate-200 hover:border-slate-300"
                  } bg-slate-950`}
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                >
                  {/* Star Primary Button */}
                  <button
                    className={`absolute top-1.5 left-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs shadow-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                      isPrimary
                        ? "bg-amber-400 text-white ring-1 ring-amber-500"
                        : "bg-white/85 text-slate-400 hover:bg-amber-400 hover:text-white"
                    }`}
                    disabled={locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimaryImage(index);
                    }}
                    title="Set as primary image"
                    type="button"
                  >
                    ★
                  </button>

                  {/* Remove Button */}
                  <button
                    className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs shadow-sm transition-transform hover:scale-110 hover:bg-rose-600 active:scale-95 cursor-pointer"
                    disabled={locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    title="Remove image"
                    type="button"
                  >
                    ✕
                  </button>

                  {/* Image Element */}
                  {img.url ? (
                    <img
                      alt={img.alt || img.title || "Product image"}
                      className="h-full w-full object-contain p-1"
                      src={img.url}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-400">
                      No URL
                    </div>
                  )}

                  {/* Primary Pill Badge */}
                  {isPrimary && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      Primary
                    </span>
                  )}
                </div>
              );
            })}

            {/* Add photo dashed button */}
            <button
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 text-slate-400 transition-all hover:border-brand-500 hover:bg-brand-50/30 hover:text-brand-700 cursor-pointer disabled:opacity-50"
              disabled={locked}
              onClick={addImage}
              type="button"
            >
              <span className="text-2xl font-light leading-none">+</span>
              <span className="mt-1 text-xs font-semibold">Add photo</span>
            </button>
          </div>

          {/* Details input for the selected image */}
          {images[activeImageIndex] && (
            <div className="mt-4 max-w-sm space-y-2.5 pt-2">
              <input
                className="field text-xs font-medium"
                disabled={locked}
                onChange={(e) => updateImage(activeImageIndex, "title", e.target.value)}
                placeholder="Title"
                value={images[activeImageIndex].title || ""}
              />
              <input
                className="field text-xs font-medium"
                disabled={locked}
                onChange={(e) => updateImage(activeImageIndex, "alt", e.target.value)}
                placeholder="Alt text"
                value={images[activeImageIndex].alt || ""}
              />
              <input
                className="field text-xs font-medium text-slate-600"
                disabled={locked}
                onChange={(e) => updateImage(activeImageIndex, "url", e.target.value)}
                placeholder="Image URL (paste or edit)"
                value={images[activeImageIndex].url || ""}
              />
            </div>
          )}
        </div>

        {/* HIGHLIGHTS */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Highlights
              </label>
              <p className="text-[11px] font-medium text-slate-400">
                Short key selling points shown on the listing page
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl">
            <RichEditor
              disabled={locked}
              height="320px"
              id="product-highlights-editor"
              onChange={(html) => setField("highlights", html)}
              placeholder="Add product highlights, bullet points, key features..."
              value={highlightsHtml}
            />
          </div>
        </div>

        {/* FULL DESCRIPTION */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Full Description
              </label>
              <p className="text-[11px] font-medium text-slate-400">
                Detailed product description, usage instructions, specifications
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl">
            <RichEditor
              disabled={locked}
              height="420px"
              id="product-description-editor"
              onChange={(html) => setField("description", html)}
              placeholder="Detailed product description, usage instructions, specifications..."
              value={draft.description || ""}
            />
          </div>
        </div>

        {/* VARIATIONS (Added after Description matching reference) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                VARIATIONS {variations.length > 0 && <span className="text-slate-400 font-normal">({variations.length})</span>}
              </h3>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
              disabled={locked}
              onClick={addVariation}
              type="button"
            >
              + Add variation
            </button>
          </div>

          <div className="p-6">
            {variations.length === 0 ? (
              <div className="py-10 text-center text-sm font-medium text-slate-400">
                No variations yet
              </div>
            ) : (
              <div className="space-y-4">
                {variations.map((item, index) => (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-all hover:bg-white hover:shadow-xs" key={index}>
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                      <span className="text-xs font-bold text-slate-700">Variation #{index + 1}</span>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                        disabled={locked}
                        onClick={() => removeVariation(index)}
                        title="Delete variation"
                        type="button"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Name / Title *</label>
                        <input
                          className="field mt-1 text-xs font-semibold"
                          disabled={locked}
                          onChange={(e) => updateVariation(index, "name", e.target.value)}
                          placeholder="e.g. Size: Large, Color: Blue"
                          value={item.name || ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">SKU</label>
                        <input
                          className="field mt-1 text-xs font-mono"
                          disabled={locked}
                          onChange={(e) => updateVariation(index, "sku", e.target.value || null)}
                          placeholder="SKU"
                          value={item.sku || ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price (₹)</label>
                        <input
                          className="field mt-1 text-xs font-bold text-brand-700"
                          disabled={locked}
                          onChange={(e) => updateVariation(index, "price", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={item.price ?? ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">MRP (₹)</label>
                        <input
                          className="field mt-1 text-xs"
                          disabled={locked}
                          onChange={(e) => updateVariation(index, "mrp", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={item.mrp ?? ""}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PACKS (Added after Variations matching reference) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                PACKS {packs.length > 0 && <span className="text-slate-400 font-normal">({packs.length})</span>}
              </h3>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
              disabled={locked}
              onClick={addPack}
              type="button"
            >
              + Add pack
            </button>
          </div>

          <div className="p-6">
            {packs.length === 0 ? (
              <div className="py-10 text-center text-sm font-medium text-slate-400">
                No packs yet
              </div>
            ) : (
              <div className="space-y-4">
                {packs.map((item, index) => (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-all hover:bg-white hover:shadow-xs" key={index}>
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                      <span className="text-xs font-bold text-slate-700">Pack #{index + 1}</span>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                        disabled={locked}
                        onClick={() => removePack(index)}
                        title="Delete pack"
                        type="button"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="lg:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Label *</label>
                        <input
                          className="field mt-1 text-xs font-semibold"
                          disabled={locked}
                          onChange={(e) => updatePack(index, "label", e.target.value)}
                          placeholder="e.g. Pack of 50, Box of 100"
                          value={item.label || ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Quantity</label>
                        <input
                          className="field mt-1 text-xs font-bold"
                          disabled={locked}
                          onChange={(e) => updatePack(index, "quantity", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="1"
                          step="1"
                          type="number"
                          value={item.quantity ?? ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Price (₹)</label>
                        <input
                          className="field mt-1 text-xs font-bold text-brand-700"
                          disabled={locked}
                          onChange={(e) => updatePack(index, "price", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={item.price ?? ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">MRP (₹)</label>
                        <input
                          className="field mt-1 text-xs"
                          disabled={locked}
                          onChange={(e) => updatePack(index, "mrp", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={item.mrp ?? ""}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PRODUCT DETAILS TABS (Pricing / Restock / SEO) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-shadow hover:shadow-sm">
          <div className="border-b border-slate-200/80 bg-slate-50/70 px-6 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Product Details
            </p>
            <div className="flex gap-2">
              {["Pricing", "Restock", "SEO"].map((tab) => (
                <button
                  className={`rounded-t-xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    detailsTab === tab
                      ? "border-t-2 border-brand-600 bg-white text-brand-700 shadow-xs"
                      : "text-slate-600 hover:text-ink-950 hover:bg-slate-100"
                  }`}
                  key={tab}
                  onClick={() => setDetailsTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* PRICING TAB */}
            {detailsTab === "Pricing" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">MRP (₹) *</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setNested("pricing", "mrp", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={draft.pricing?.mrp ?? ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Sale price (₹) *</label>
                  <input
                    className="field mt-1 font-bold text-brand-700"
                    disabled={locked}
                    onChange={(e) => setNested("pricing", "sale_price", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={draft.pricing?.sale_price ?? ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">GST (%)</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setNested("pricing", "gst", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="5"
                    step="0.01"
                    type="number"
                    value={draft.pricing?.gst ?? 5}
                  />
                </div>
              </div>
            )}

            {/* RESTOCK / INVENTORY TAB */}
            {detailsTab === "Restock" && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Quantity</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setField("quantity", Number(e.target.value))}
                    type="number"
                    value={draft.quantity ?? 1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Step up quantity</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setField("step_up_quantity", Number(e.target.value))}
                    type="number"
                    value={draft.step_up_quantity ?? 1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Pieces</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setField("pieces", Number(e.target.value))}
                    type="number"
                    value={draft.pieces ?? 1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">In stock quantity</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setField("in_stock_quantity", Number(e.target.value))}
                    type="number"
                    value={draft.in_stock_quantity ?? 100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Sales count</label>
                  <input
                    className="field mt-1 font-bold"
                    disabled={locked}
                    onChange={(e) => setField("sales_count", Number(e.target.value))}
                    type="number"
                    value={draft.sales_count ?? 0}
                  />
                </div>
              </div>
            )}

            {/* SEO TAB */}
            {detailsTab === "SEO" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Meta title</label>
                    <input
                      className="field mt-1"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "meta_title", e.target.value)}
                      placeholder="Meta title"
                      value={draft.seo?.meta_title || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Business meta title</label>
                    <input
                      className="field mt-1"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "business_meta_title", e.target.value)}
                      placeholder="Business meta title"
                      value={draft.seo?.business_meta_title || ""}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Meta keywords</label>
                  <input
                    className="field mt-1"
                    disabled={locked}
                    onChange={(e) =>
                      setNested(
                        "seo",
                        "meta_keywords",
                        e.target.value.split(",").map((k) => k.trim()).filter(Boolean)
                      )
                    }
                    placeholder="comma, separated, keywords"
                    value={Array.isArray(draft.seo?.meta_keywords) ? draft.seo.meta_keywords.join(", ") : ""}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Meta description</label>
                    <textarea
                      className="field mt-1 resize-y"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "meta_description", e.target.value)}
                      placeholder="Meta description"
                      rows={3}
                      value={draft.seo?.meta_description || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Business meta description</label>
                    <textarea
                      className="field mt-1 resize-y"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "business_meta_description", e.target.value)}
                      placeholder="Business meta description"
                      rows={3}
                      value={draft.seo?.business_meta_description || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Canonical link</label>
                    <input
                      className="field mt-1"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "canonical_link", e.target.value)}
                      placeholder="https://..."
                      value={draft.seo?.canonical_link || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Business canonical link</label>
                    <input
                      className="field mt-1"
                      disabled={locked}
                      onChange={(e) => setNested("seo", "business_canonical_link", e.target.value)}
                      placeholder="https://..."
                      value={draft.seo?.business_canonical_link || ""}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar Controls */}
      <div className="space-y-6">
        {/* STATUS CARD (iOS-style toggles matching screenshots) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              STATUS
            </p>
            <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              Storefront Toggles
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            <ToggleRow
              description="Visible on storefront"
              disabled={locked}
              icon="⚫"
              label="Active"
              onChange={(v) => setField("is_active", v)}
              value={draft.is_active ?? true}
            />
            <ToggleRow
              description="Available to purchase"
              disabled={locked}
              icon="📦"
              label="In stock"
              onChange={(v) => setField("is_in_stock", v)}
              value={draft.is_in_stock ?? true}
            />
            <ToggleRow
              description="Show fast delivery badge"
              disabled={locked}
              icon="⚡"
              label="Fast delivery"
              onChange={(v) => setField("is_fast_delivery", v)}
              value={draft.is_fast_delivery ?? true}
            />
            <ToggleRow
              description="Cash on delivery"
              disabled={locked}
              icon="💵"
              label="COD available"
              onChange={(v) => setField("is_cod_available", v)}
              value={draft.is_cod_available ?? true}
            />
            <ToggleRow
              description="Rx product — login to order"
              disabled={locked}
              icon="℞"
              label="Prescription required"
              onChange={(v) => setField("is_prescription_required", v)}
              value={draft.is_prescription_required ?? false}
            />
            <ToggleRow
              description="Supports custom orders"
              disabled={locked}
              icon="🎨"
              label="Customisation available"
              onChange={(v) => setField("customisation_available", v)}
              value={draft.customisation_available ?? false}
            />
            <ToggleRow
              description="Product is returnable"
              disabled={locked}
              icon="↩️"
              label="Returnable"
              onChange={(v) => setField("is_returnble", v)}
              value={draft.is_returnble ?? true}
            />
            <ToggleRow
              description="Contains liquid material"
              disabled={locked}
              icon="💧"
              label="Liquid product"
              onChange={(v) => setField("is_liquid", v)}
              value={draft.is_liquid ?? false}
            />
          </div>
        </div>

        {/* IDENTIFIERS CARD */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            IDENTIFIERS
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700">Slug</label>
            <input
              className="field mt-1 font-mono text-xs"
              disabled={locked}
              onChange={(e) => setField("slug", e.target.value)}
              placeholder="auto-generated from title"
              value={draft.slug || ""}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Rack ID</label>
            <input
              className="field mt-1"
              disabled={locked}
              onChange={(e) => setField("rack_id", e.target.value)}
              placeholder="e.g. R-12-A"
              value={draft.rack_id || ""}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">SKU</label>
            <input
              className="field mt-1 font-mono font-bold"
              disabled={locked}
              onChange={(e) => setField("sku", e.target.value)}
              placeholder="SKU"
              value={draft.sku || ""}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">GTIN</label>
            <input
              className="field mt-1 font-mono"
              disabled={locked}
              onChange={(e) => setField("gtin", e.target.value)}
              placeholder="GTIN / Barcode"
              value={draft.gtin || ""}
            />
          </div>
        </div>

        {/* ORGANISE CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            ORGANISE
          </p>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Category *</label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Surginatal ID:</span>
                <input
                  className="w-16 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-emerald-800 focus:border-brand-600 focus:bg-white focus:outline-none"
                  disabled={locked}
                  onChange={(e) => setField("category_id", e.target.value ? Number(e.target.value) : null)}
                  placeholder="None"
                  title="Surginatal Category ID"
                  type="number"
                  value={draft.category_id ?? ""}
                />
              </div>
            </div>
            <input
              className="field mt-1"
              disabled={locked}
              onChange={(e) => setField("category", e.target.value)}
              placeholder="Select category"
              value={draft.category || ""}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Sub-category *</label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Surginatal ID:</span>
                <input
                  className="w-16 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-emerald-800 focus:border-brand-600 focus:bg-white focus:outline-none"
                  disabled={locked}
                  onChange={(e) => setField("subcategory_id", e.target.value ? Number(e.target.value) : null)}
                  placeholder="None"
                  title="Surginatal Sub-category ID"
                  type="number"
                  value={draft.subcategory_id ?? ""}
                />
              </div>
            </div>
            <input
              className="field mt-1"
              disabled={locked}
              onChange={(e) => setField("subcategory", e.target.value)}
              placeholder="Select sub-category"
              value={draft.subcategory || ""}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Brand *</label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Surginatal ID:</span>
                <input
                  className="w-16 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-emerald-800 focus:border-brand-600 focus:bg-white focus:outline-none"
                  disabled={locked}
                  onChange={(e) => setField("brand_id", e.target.value ? Number(e.target.value) : null)}
                  placeholder="None"
                  title="Surginatal Brand ID"
                  type="number"
                  value={draft.brand_id ?? ""}
                />
              </div>
            </div>
            <input
              className="field mt-1 font-bold text-brand-800"
              disabled={locked}
              onChange={(e) => setField("brand", e.target.value)}
              placeholder="Select brand"
              value={draft.brand || ""}
            />
          </div>
        </div>

        {/* RELATED PRODUCTS CARD */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            RELATED PRODUCTS
          </p>
          <p className="mt-1 text-xs text-slate-500">Products shown alongside this item</p>
          <input
            className="field mt-3"
            disabled={locked}
            onChange={(e) => setField("related_products", e.target.value)}
            placeholder="Search and select products / IDs…"
            value={draft.related_products || ""}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, description, value, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex items-center gap-3">
        <span className="text-sm">{icon}</span>
        <div>
          <p className="text-xs font-bold text-ink-950">{label}</p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
      </div>
      <button
        aria-checked={value}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 ${
          value ? "bg-brand-600" : "bg-slate-200"
        }`}
        disabled={disabled}
        onClick={() => onChange(!value)}
        role="switch"
        type="button"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
