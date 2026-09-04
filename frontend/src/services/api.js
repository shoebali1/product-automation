import axios from "axios";

const developmentApiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8010/api/v1`;

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? developmentApiBaseUrl : "/api/v1"),
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    error.userMessage = typeof detail === "string" ? detail : "The request could not be completed.";
    return Promise.reject(error);
  },
);

export const researchApi = {
  createJob: (urls) => api.post("/product-research/jobs", { urls }).then(({ data }) => data),
  getJob: (jobId) => api.get(`/product-research/jobs/${jobId}`).then(({ data }) => data),
  retrySource: (jobId, sourceId) =>
    api.post(`/product-research/jobs/${jobId}/sources/${sourceId}/retry`).then(({ data }) => data),
  generate: (jobId) => api.post(`/product-research/jobs/${jobId}/generate`).then(({ data }) => data),
};

export const productsApi = {
  taxonomy: () => api.get("/generated-products/taxonomy/options").then(({ data }) => data),
  list: (params) => api.get("/generated-products", { params }).then(({ data }) => data),
  get: (productId) => api.get(`/generated-products/${productId}`).then(({ data }) => data),
  update: (productId, payload) => api.put(`/generated-products/${productId}`, payload).then(({ data }) => data),
  submitToSurginatal: (productId, product, localImages = []) => {
    const payload = new FormData();
    const append = (key, value) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.append(key, String(value));
      }
    };
    const pricing = product.pricing || {};
    const seo = product.seo || {};
    const highlightsHtml = Array.isArray(product.highlights) && product.highlights.length
      ? `<ul>${product.highlights.map((item) => (
        `<li><strong>${item.name || ""}:</strong> ${item.value || ""}</li>`
      )).join("")}</ul>`
      : "";

    append("product_id", product.surginatal_product_id);
    append("name", product.product_title);
    append("business_name", product.business_product_title);
    append("short_description", product.short_description || highlightsHtml);
    append("description", product.description);
    append("mrp", pricing.mrp);
    append("price", pricing.sale_price);
    append("gst", pricing.gst);
    append("quantity", product.quantity);
    append("step_up_quantity", product.step_up_quantity);
    append("pieces", product.pieces);
    append("in_stock_quantity", product.in_stock_quantity);
    append("SKU", product.sku);
    append("rack_id", product.rack_id);
    append("is_active", product.is_active);
    append("is_in_stock", product.is_in_stock);
    append("is_fast_delivery", product.is_fast_delivery);
    append("is_cod_available", product.is_cod_available);
    append("customisation_available", product.customisation_available);
    append("is_prescription_required", product.is_prescription_required);
    append("is_returnble", product.is_returnble);
    append("is_liquid", product.is_liquid);
    append("brand", product.brand_id);
    append("gtin", product.gtin);
    append("canonical_link", seo.canonical_link);
    append("meta_title", seo.meta_title);
    append(
      "meta_keyword",
      Array.isArray(seo.meta_keywords) ? seo.meta_keywords.join(", ") : seo.meta_keywords,
    );
    append("meta_description", seo.meta_description);
    append("bussiess_meta_title", seo.business_meta_title);
    append("bussiess_meta_description", seo.business_meta_description);
    append("bussiess_canonical_link", seo.business_canonical_link);
    append("sales_count", product.sales_count);
    append("category", product.category_id);
    append("subcategory", product.subcategory_id);
    append("action", "publish_product");
    localImages.forEach((image, index) => {
      payload.append("images", image.file, image.file.name);
      payload.append("image_titles", image.title || "");
      payload.append("image_alt", image.alt || "");
      if (image.primary_candidate) payload.set("primary_image_index", String(index));
    });
    return api.post(`/generated-products/${productId}/surginatal`, payload, {
      // Let the browser add multipart/form-data with its required boundary.
      // Setting this header manually causes FastAPI to reject the body with HTTP 400.
      headers: { "Content-Type": undefined },
      timeout: 120_000,
    }).then(({ data }) => data);
  },
  approve: (productId) => api.post(`/generated-products/${productId}/approve`).then(({ data }) => data),
  publish: (productId) => api.post(`/generated-products/${productId}/publish`).then(({ data }) => data),
  conflicts: (productId) => api.get(`/generated-products/${productId}/conflicts`).then(({ data }) => data),
  resolveConflict: (productId, conflictId, payload) =>
    api.put(`/generated-products/${productId}/conflicts/${conflictId}`, payload).then(({ data }) => data),
};

export const aiAdminApi = {
  providers: () => api.get("/admin/ai/providers").then(({ data }) => data),
  updateProvider: (providerId, payload) => api.put(`/admin/ai/providers/${providerId}`, payload).then(({ data }) => data),
  createModel: (providerId, payload) => api.post(`/admin/ai/providers/${providerId}/models`, payload).then(({ data }) => data),
  updateModel: (modelId, payload) => api.put(`/admin/ai/models/${modelId}`, payload).then(({ data }) => data),
  deleteModel: (modelId) => api.delete(`/admin/ai/models/${modelId}`),
  // Model checks have a bounded 25-second backend timeout, so allow enough time for the
  // API to return its useful provider error instead of Axios canceling first at 20 seconds.
  testModel: (modelId) =>
    api.post(`/admin/ai/models/${modelId}/test`, undefined, { timeout: 35_000 }).then(({ data }) => data),
};

export default api;
