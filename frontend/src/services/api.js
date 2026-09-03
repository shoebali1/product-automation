import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8010/api/v1",
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
  list: (params) => api.get("/generated-products", { params }).then(({ data }) => data),
  get: (productId) => api.get(`/generated-products/${productId}`).then(({ data }) => data),
  update: (productId, payload) => api.put(`/generated-products/${productId}`, payload).then(({ data }) => data),
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
