import { NavLink, Outlet } from "react-router";

export default function AppShell() {
  return (
    <div className="min-h-screen text-ink-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-6 sm:px-10 md:px-14 lg:px-16">
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
          <nav aria-label="Main navigation" className="flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-xs">
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-brand-700 shadow-xs border border-slate-200/80 font-black"
                    : "text-slate-600 hover:bg-white/60 hover:text-ink-950"
                }`
              }
              to="/research"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Product research</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-brand-700 shadow-xs border border-slate-200/80 font-black"
                    : "text-slate-600 hover:bg-white/60 hover:text-ink-950"
                }`
              }
              to="/catalog"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Product Catalog</span>
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-brand-700 shadow-xs border border-slate-200/80 font-black"
                    : "text-slate-600 hover:bg-white/60 hover:text-ink-950"
                }`
              }
              to="/admin/ai"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>AI providers</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1360px] px-6 py-8 sm:px-10 md:px-14 lg:px-16">
        <Outlet />
      </main>
    </div>
  );
}
