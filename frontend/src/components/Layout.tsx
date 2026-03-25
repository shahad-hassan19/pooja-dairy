import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { Role } from '../types';
import { cx } from '../lib/cx';
import { Button } from './ui/Button';

const navByRole: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/shops', label: 'Shops' },
    { to: '/users', label: 'Users' },
    { to: '/billing', label: 'Billing' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/transfers', label: 'Transfers' },
    { to: '/audit', label: 'Audit' },
  ],
  SALES: [
    { to: '/billing', label: 'Billing' },
    { to: '/inventory', label: 'Inventory' },
  ],
  STOCK_MANAGER: [
    { to: '/inventory', label: 'Inventory' },
    { to: '/transfers', label: 'Transfers' },
  ],
  ACCOUNTS: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/audit', label: 'Audit' },
  ],
};

/** Map path segments to human-readable labels */
const SEGMENT_LABELS: Record<string, string> = {
  shops: 'Shops',
  users: 'Users',
  billing: 'Billing',
  inventory: 'Inventory',
  transfers: 'Transfers',
  audit: 'Audit',
};

function Breadcrumb() {
  const location = useLocation();

  // Build crumb list from pathname
  const segments = location.pathname.split('/').filter(Boolean);

  // Always start with Dashboard (root)
  const crumbs: { label: string; to: string }[] = [];

  segments.forEach((seg, i) => {
    const to = '/' + segments.slice(0, i + 1).join('/');
    // Use known label or title-case the segment as fallback
    const label =
      SEGMENT_LABELS[seg] ??
      seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, to });
  });

  // Don't render if we're already on the root
  if (crumbs.length === 1 && location.pathname === '/') return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.to} className="flex items-center gap-1.5">
            {idx > 0 && (
              <svg
                className="h-3.5 w-3.5 shrink-0 text-ink/30"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {isLast ? (
              <span className="text-xs font-medium text-ink" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-xs font-medium text-ink/50 hover:text-brand transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? navByRole[user.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <div className="min-h-screen">

      {/* ── Fixed full-height sidebar (desktop) ── */}
      <aside className={` ${sidebarOpen ? "flex" : "hidden" } flex flex-col fixed inset-y-0 left-0 z-40 w-64 border-r border-cream-dark bg-cream-light/50 transition-all duration-700 `}>
        <div className="px-4 py-6 flex flex-col h-full">
          <div className="group inline-flex items-center gap-2.5 mb-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white text-sm font-bold shadow-card">
              PD
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink group-hover:text-brand">
              Pooja Dairy
            </span>
          </div>
          <nav className="space-y-0.5 flex-1">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cx(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(to)
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink/70 hover:bg-cream-dark/60 hover:text-ink',
                )}
              >
                <span>{label}</span>
                {isActive(to) ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Content area offset by sidebar width ── */}
      <div className={` ${sidebarOpen ? "lg:pl-64" : "pl-0"} transition-all duration-700 flex flex-col min-h-screen`}>

        {/* ── Sticky header (spans remaining width only) ── */}
        <header className="sticky top-0 z-30 border-b border-cream-dark bg-cream-light/95 backdrop-blur-sm shadow-card">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cream-dark bg-cream text-ink/70 hover:bg-cream-dark hover:text-ink`}
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label="Open menu"
              >
                <span className="sr-only">Open menu</span>
                <span className="block h-[2px] w-5 bg-ink/60 relative before:content-[''] before:absolute before:-top-2 before:left-0 before:h-[2px] before:w-5 before:bg-ink/60 after:content-[''] after:absolute after:top-2 after:left-0 after:h-[2px] after:w-5 after:bg-ink/60" />
              </button>

              <div className={`${sidebarOpen ? "hidden": "group hidden md:inline-flex items-center gap-2.5 my-6"} `}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white text-sm font-bold shadow-card">
                  PD
                </span>
                <span className="text-sm font-semibold tracking-tight text-ink group-hover:text-brand">
                  Pooja Dairy
                </span>
              </div>

              {/* Breadcrumb */}
              <Breadcrumb />
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-cream-dark bg-cream px-3 py-1.5 text-xs font-medium text-ink/70">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {user?.role}
              </span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Log out
            </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-cream-light border-r border-cream-dark shadow-elevated p-5">
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="group inline-flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white text-sm font-bold shadow-card">
                  PD
                </span>
                <span className="text-sm font-semibold tracking-tight text-ink group-hover:text-brand">
                  Pooja Dairy
                </span>
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cream-dark text-ink/70 hover:bg-cream-dark"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={cx(
                    'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'bg-brand/10 text-brand'
                      : 'text-ink/70 hover:bg-cream-dark',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

    </div>
  );
}