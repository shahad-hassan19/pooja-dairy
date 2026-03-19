import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { Role } from '../types';
import { cx } from '../lib/cx';
import { Button } from './ui/Button';

const navByRole: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: '/', label: 'Dashboard' },
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
    { to: '/', label: 'Dashboard' },
    { to: '/audit', label: 'Audit' },
  ],
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? navByRole[user.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-cream-dark bg-cream-light/95 backdrop-blur-sm shadow-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cream-dark bg-cream text-ink/70 hover:bg-cream-dark hover:text-ink lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="sr-only">Open menu</span>
              <span className="block h-[2px] w-5 bg-ink/60 relative before:content-[''] before:absolute before:-top-2 before:left-0 before:h-[2px] before:w-5 before:bg-ink/60 after:content-[''] after:absolute after:top-2 after:left-0 after:h-[2px] after:w-5 after:bg-ink/60" />
            </button>

            <Link to="/" className="group inline-flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white text-sm font-bold shadow-card">
                PD
              </span>
              <span className="text-sm font-semibold tracking-tight text-ink group-hover:text-brand">
                Pooja Dairy
              </span>
            </Link>
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

      <div className="flex flex-1">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-cream-dark bg-cream-light/50 px-4 py-6">
          <nav className="space-y-0.5">
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
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-cream-light border-r border-cream-dark shadow-elevated p-5">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm font-semibold text-ink">Menu</div>
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

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
