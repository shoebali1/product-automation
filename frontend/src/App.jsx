import { Navigate, Route, Routes } from "react-router";

import AppShell from "./layouts/AppShell";
import JobStatusPage from "./pages/JobStatusPage";
import ProductCatalogPage from "./pages/ProductCatalogPage";
import ProductResearchPage from "./pages/ProductResearchPage";
import ProductReviewPage from "./pages/ProductReviewPage";
import AIProvidersPage from "./pages/AIProvidersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/research" />} />
        <Route path="/research" element={<ProductResearchPage />} />
        <Route path="/research/jobs/:jobId" element={<JobStatusPage />} />
        <Route path="/catalog" element={<ProductCatalogPage />} />
        <Route path="/products" element={<ProductCatalogPage />} />
        <Route path="/products/:productId" element={<ProductReviewPage />} />
        <Route path="/admin/ai" element={<AIProvidersPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/research" />} />
    </Routes>
  );
}
