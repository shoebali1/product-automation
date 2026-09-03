import { NavLink, Outlet } from "react-router";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e7f3ed_0,transparent_28rem)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-sm font-black text-white">PI</div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-ink-950">Product Intelligence</p>
              <p className="text-[11px] font-medium text-ink-500">Evidence-led automation</p>
            </div>
          </div>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-slate-100"}`
              }
              to="/research"
            >
              Product research
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-slate-100"}`
              }
              to="/catalog"
            >
              Product Catalog
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-slate-100"}`
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
