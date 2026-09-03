import { NavLink, Outlet } from "react-router";

export default function AppShell() {
  return (
    <div className="min-h-screen text-ink-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-xs">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black tracking-tight text-ink-950">Product Intelligence</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Multi-source catalog automation</p>
            </div>
          </div>
          <nav aria-label="Main navigation" className="flex items-center gap-1.5">
            <NavLink
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-xs border border-brand-200/60"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink-950"
                }`
              }
              to="/research"
            >
              Product research
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-xs border border-brand-200/60"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink-950"
                }`
              }
              to="/catalog"
            >
              Product Catalog
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-xs border border-brand-200/60"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink-950"
                }`
              }
              to="/admin/ai"
            >
              AI providers
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
