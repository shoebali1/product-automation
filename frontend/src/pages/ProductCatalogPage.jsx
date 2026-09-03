import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import StatusBadge from "../components/StatusBadge";
import { productsApi } from "../services/api";

export default function ProductCatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const productsQuery = useQuery({
    queryKey: ["products-list"],
    queryFn: () => productsApi.list(),
  });

  const products = productsQuery.data || [];

  const counts = useMemo(() => {
    return {
      all: products.length,
      published: products.filter((p) => p.status === "PUBLISHED").length,
      approved: products.filter((p) => p.status === "APPROVED").length,
      review: products.filter((p) => ["DRAFT", "REVIEW_REQUIRED"].includes(p.status)).length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchStatus =
        selectedStatus === "ALL"
          ? true
          : selectedStatus === "PUBLISHED"
          ? item.status === "PUBLISHED"
          : selectedStatus === "APPROVED"
          ? item.status === "APPROVED"
          : ["DRAFT", "REVIEW_REQUIRED"].includes(item.status);

      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.product_title?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [products, selectedStatus, search]);

  if (productsQuery.isPending) return <CatalogSkeleton />;
  if (productsQuery.isError) return <div className="panel p-8 text-rose-700 font-bold">{productsQuery.error.userMessage}</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Product Intelligence Catalog</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">Published & Generated Products</h1>
          <p className="mt-2 text-xs text-slate-500 max-w-2xl leading-relaxed">
            Browse, inspect, and export all AI-synthesized product records, multi-source evidence, and live catalog data.
          </p>
        </div>
        <Link
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-3 text-xs font-black text-white shadow-xs hover:from-brand-700 hover:to-brand-800 transition-all cursor-pointer"
          to="/research"
        >
          <span>+ New Research Job</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Products" tone="text-ink-950" value={counts.all} />
        <StatCard label="Published Live" tone="text-teal-700" value={counts.published} />
        <StatCard label="Approved" tone="text-emerald-700" value={counts.approved} />
        <StatCard label="In Review / Draft" tone="text-amber-700" value={counts.review} />
      </div>

      {/* Filter and Search Bar */}
      <div className="panel flex flex-col gap-4 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: `All (${counts.all})` },
            { id: "PUBLISHED", label: `Published (${counts.published})` },
            { id: "APPROVED", label: `Approved (${counts.approved})` },
            { id: "REVIEW", label: `In Review (${counts.review})` },
          ].map((tab) => (
            <button
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === tab.id
                  ? "bg-brand-50 text-brand-700 border border-brand-200/80 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:max-w-xs">
          <input
            className="field text-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, brand, SKU…"
            type="search"
            value={search}
          />
        </div>
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-base font-bold text-ink-950">No products found</p>
          <p className="mt-1 text-xs text-slate-500">
            {search
              ? "Try adjusting your search query or filters."
              : "Generate and publish your first product from the Product Research page."}
          </p>
          <Link
            className="mt-5 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
            to="/research"
          >
            Start New Research
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              className="panel flex flex-col justify-between overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              key={product.id}
            >
              <div className="p-5">
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={product.status} />
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/80">
                    {Math.round(product.overall_confidence * 100)}% Confidence
                  </span>
                </div>

                {/* Thumbnail & Title */}
                <div className="mt-4 flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    {product.thumbnail_url ? (
                      <img
                        alt={product.product_title}
                        className="h-full w-full object-contain p-1"
                        src={product.thumbnail_url}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">No Image</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 truncate">
                      {product.brand || "General Brand"}
                    </p>
                    <h3 className="line-clamp-2 text-xs font-bold text-ink-950 leading-snug mt-0.5">
                      {product.product_title}
                    </h3>
                    {product.category && (
                      <p className="mt-1 text-[11px] text-slate-500 truncate">{product.category}</p>
                    )}
                  </div>
                </div>

                {/* Metadata & Pricing */}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">SKU:</span>
                    <p className="font-mono text-xs font-bold text-slate-800 truncate">
                      {product.sku || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Price:</span>
                    <p className="text-xs font-black text-ink-950">
                      {product.sale_price != null
                        ? `${product.currency || "₹"} ${product.sale_price}`
                        : product.mrp != null
                        ? `MRP ${product.currency || "₹"} ${product.mrp}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                {product.published_external_id && (
                  <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-mono text-slate-600 truncate border border-slate-100">
                    Published ID: {product.published_external_id}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="border-t border-slate-100 bg-slate-50/60 p-3 px-5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  v{product.version}
                </span>
                <Link
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900 transition-colors"
                  to={`/products/${product.id}`}
                >
                  <span>View Details</span>
                  <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="panel p-4 transition-all hover:shadow-xs">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-72 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="panel h-20" key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div className="panel h-52" key={i} />
        ))}
      </div>
    </div>
  );
}
