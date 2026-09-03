import { useMemo, useState } from "react";

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

  // Format highlights to string if array, or update
  const highlightsText = useMemo(() => {
    if (typeof draft.highlights === "string") return draft.highlights;
    if (Array.isArray(draft.highlights)) {
      return draft.highlights.map((h) => (typeof h === "object" ? `${h.name ? h.name + ": " : ""}${h.value || ""}` : String(h))).join("\n");
    }
    return "";
  }, [draft.highlights]);

  const handleHighlightsChange = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const structured = lines.map((line, i) => {
      const parts = line.split(":");
      if (parts.length > 1) {
        return { name: parts[0].trim(), value: parts.slice(1).join(":").trim() };
      }
      return { name: `Highlight ${i + 1}`, value: line.trim() };
    });
    onChange({ ...draft, highlights: structured });
  };

  // Image helpers
  const images = draft.images || [];
  const addImage = () => {
    onChange({
      ...draft,
      images: [
        ...images,
        {
          url: "",
          title: "",
          alt: "",
          primary_candidate: images.length === 0,
          reference_only: true,
        },
      ],
    });
  };

  const updateImage = (index, field, value) => {
    const updated = images.map((img, i) => {
      if (i === index) {
        return { ...img, [field]: value };
      }
      if (field === "primary_candidate" && value === true) {
        return { ...img, primary_candidate: false };
      }
      return img;
    });
    onChange({ ...draft, images: updated });
  };

  const removeImage = (index) => {
    onChange({ ...draft, images: images.filter((_, i) => i !== index) });
  };

  const wordCount = (str) => (str ? str.trim().split(/\s+/).filter(Boolean).length : 0);
  const charCount = (str) => (str ? str.length : 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT COLUMN: Main Form Fields (2 Cols) */}
      <div className="space-y-6 lg:col-span-2">
        {/* PRODUCT TITLE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
            Product Title *
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-ink-950 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none"
            disabled={locked}
            onChange={(e) => setField("product_title", e.target.value)}
            placeholder="e.g. Surgical Gloves Medium — Box of 100"
            value={draft.product_title || ""}
          />
        </div>

        {/* BUSINESS PRODUCT TITLE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
            Business Product Title
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-ink-950 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none"
            disabled={locked}
            onChange={(e) => setField("business_product_title", e.target.value)}
            placeholder="e.g. Surgical Gloves Medium — Box of 100"
            value={draft.business_product_title || ""}
          />
        </div>

        {/* MEDIA / IMAGES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Media ({images.length} images)
            </label>
            <button
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-slate-200 disabled:opacity-50"
              disabled={locked}
              onClick={addImage}
              type="button"
            >
              + Add Image URL
            </button>
          </div>

          <div className="mt-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <p className="mt-2 text-sm font-extrabold text-indigo-900">
              Scraped product media preview & gallery
            </p>
            <p className="text-xs text-slate-500">PNG, JPG, WEBP — automatically extracted & verified</p>
          </div>

          {images.length > 0 && (
            <div className="mt-4 space-y-4">
              {images.map((img, index) => (
                <div
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center"
                  key={index}
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {img.url ? (
                      <img alt={img.alt || "Product"} className="h-full w-full object-contain p-1" src={img.url} />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">No Preview</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                      disabled={locked}
                      onChange={(e) => updateImage(index, "url", e.target.value)}
                      placeholder="Image URL"
                      value={img.url || ""}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs"
                        disabled={locked}
                        onChange={(e) => updateImage(index, "title", e.target.value)}
                        placeholder="Image Title"
                        value={img.title || ""}
                      />
                      <input
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs"
                        disabled={locked}
                        onChange={(e) => updateImage(index, "alt", e.target.value)}
                        placeholder="Image Alt text"
                        value={img.alt || ""}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-ink-700">
                        <input
                          checked={img.primary_candidate || false}
                          disabled={locked}
                          onChange={(e) => updateImage(index, "primary_candidate", e.target.checked)}
                          type="checkbox"
                        />
                        Primary Image (Index {index})
                      </label>
                      <button
                        className="text-xs font-bold text-rose-600 hover:underline"
                        disabled={locked}
                        onClick={() => removeImage(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HIGHLIGHTS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Highlights
            </label>
            <span className="text-[11px] font-semibold text-slate-400">
              Short selling points shown on the listing page
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Paragraph</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">sans-serif</span>
              <span className="px-1.5 py-0.5 font-black text-slate-900">B</span>
              <span className="px-1.5 py-0.5 italic text-slate-900">I</span>
              <span className="px-1.5 py-0.5 underline text-slate-900">U</span>
              <span className="text-slate-300">|</span>
              <span>• Bullet list</span>
              <span>1. Numbered list</span>
            </div>
            <textarea
              className="w-full resize-y p-4 text-sm leading-relaxed text-ink-950 placeholder:text-slate-400 focus:outline-none"
              disabled={locked}
              onChange={(e) => handleHighlightsChange(e.target.value)}
              placeholder="• Latex-free • Sterile, single use • CE certified"
              rows={4}
              value={highlightsText}
            />
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-right text-[11px] font-medium text-slate-400">
              {wordCount(highlightsText)} words | {charCount(highlightsText)} characters
            </div>
          </div>
        </div>

        {/* FULL DESCRIPTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Full Description
            </label>
            <span className="text-[11px] font-semibold text-slate-400">
              Detailed product description, usage instructions, specifications
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Paragraph</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">sans-serif</span>
              <span className="px-1.5 py-0.5 font-black text-slate-900">B</span>
              <span className="px-1.5 py-0.5 italic text-slate-900">I</span>
              <span className="px-1.5 py-0.5 underline text-slate-900">U</span>
              <span className="text-slate-300">|</span>
              <span>• Bullet list</span>
              <span>1. Numbered list</span>
            </div>
            <textarea
              className="w-full resize-y p-4 text-sm leading-relaxed text-ink-950 placeholder:text-slate-400 focus:outline-none"
              disabled={locked}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Detailed product description..."
              rows={8}
              value={draft.description || ""}
            />
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-right text-[11px] font-medium text-slate-400">
              {wordCount(draft.description)} words | {charCount(draft.description)} characters
            </div>
          </div>
        </div>

        {/* PRODUCT DETAILS TABS (Pricing / Restock / SEO) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 pt-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Product Details
            </p>
            <div className="flex gap-2">
              {["Pricing", "Restock", "SEO"].map((tab) => (
                <button
                  className={`rounded-t-xl px-5 py-2.5 text-xs font-black transition-all ${
                    detailsTab === tab
                      ? "border-t-2 border-brand-600 bg-white text-brand-700 shadow-sm"
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
                    className="field mt-1 font-bold"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">
            STATUS
          </p>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
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
              {draft.category_id && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  ID: {draft.category_id} (Surginatal)
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-2">
              <input
                className="field flex-1"
                disabled={locked}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Select category"
                value={draft.category || ""}
              />
              <input
                className="field w-24 font-mono text-xs"
                disabled={locked}
                onChange={(e) => setField("category_id", e.target.value ? Number(e.target.value) : null)}
                placeholder="Cat ID"
                title="Surginatal Category ID"
                type="number"
                value={draft.category_id ?? ""}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Sub-category *</label>
              {draft.subcategory_id && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  ID: {draft.subcategory_id} (Surginatal)
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-2">
              <input
                className="field flex-1"
                disabled={locked}
                onChange={(e) => setField("subcategory", e.target.value)}
                placeholder="Select sub-category"
                value={draft.subcategory || ""}
              />
              <input
                className="field w-24 font-mono text-xs"
                disabled={locked}
                onChange={(e) => setField("subcategory_id", e.target.value ? Number(e.target.value) : null)}
                placeholder="Sub ID"
                title="Surginatal Sub-category ID"
                type="number"
                value={draft.subcategory_id ?? ""}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Brand *</label>
              {draft.brand_id && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  ID: {draft.brand_id} (Surginatal)
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-2">
              <input
                className="field flex-1 font-bold text-brand-800"
                disabled={locked}
                onChange={(e) => setField("brand", e.target.value)}
                placeholder="Select brand"
                value={draft.brand || ""}
              />
              <input
                className="field w-24 font-mono text-xs"
                disabled={locked}
                onChange={(e) => setField("brand_id", e.target.value ? Number(e.target.value) : null)}
                placeholder="Brand ID"
                title="Surginatal Brand ID"
                type="number"
                value={draft.brand_id ?? ""}
              />
            </div>
          </div>
        </div>

        {/* RELATED PRODUCTS CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
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
          <p className="text-xs font-black text-ink-950">{label}</p>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
      </div>
      <button
        aria-checked={value}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
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

