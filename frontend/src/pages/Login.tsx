import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Callout, Page } from '../components/ui/Page';
import { Field, inputClass } from '../components/ui/Field';
import { cx } from '../lib/cx';

const personas = [
  {
    key: 'ADMIN',
    label: 'Admin',
    description: 'Full access to all modules',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: 'bg-amber-500',
    ring: 'ring-amber-500/20',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'SALES',
    label: 'Sales',
    description: 'Billing & invoices',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    color: 'bg-blue-500',
    ring: 'ring-blue-500/20',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'STOCK_MANAGER',
    label: 'Warehouse',
    description: 'Inventory & transfers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    color: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'ACCOUNTS',
    label: 'Accounts',
    description: 'Reports & audit logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    color: 'bg-violet-500',
    ring: 'ring-violet-500/20',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
  },
] as const;

type PersonaKey = (typeof personas)[number]['key'];

export function Login() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isReady, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (user && isReady) return <Navigate to={from} replace />;

  const activePersona = personas.find((p) => p.key === selectedPersona);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedPersona(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <Page className="min-h-[calc(100vh-56px)] flex items-center justify-center py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-cream-dark bg-cream-light px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-sm font-semibold text-ink">Pooja Dairy</span>
          </div>

          {!selectedPersona ? (
            <>
              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-ink/60">
                Choose your role to sign in.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                Sign in as {activePersona!.label}
              </h1>
              <p className="mt-2 text-sm text-ink/60">
                {activePersona!.description}
              </p>
            </>
          )}
        </div>

        {/* Persona selector */}
        {!selectedPersona ? (
          <div className="grid grid-cols-2 gap-3">
            {personas.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPersona(p.key)}
                className={cx(
                  'group relative flex flex-col items-center gap-3 rounded-2xl border border-cream-dark/60 bg-white p-6',
                  'shadow-card transition-all duration-200',
                  'hover:shadow-elevated hover:-translate-y-0.5 hover:border-cream-dark',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                )}
              >
                <div
                  className={cx(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-110',
                    p.color,
                  )}
                >
                  {p.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  <p className="mt-0.5 text-xs text-ink/50">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Login form */
          <div>
            <Card className="p-6 sm:p-8">
              {/* Role badge */}
              <div className="mb-5 flex items-center justify-between">
                <span
                  className={cx(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                    activePersona!.badge,
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    {activePersona!.icon}
                  </span>
                  {activePersona!.label}
                </span>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-medium text-ink/50 hover:text-ink transition-colors"
                >
                  Change role
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Email">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className={inputClass}
                  />
                </Field>
                <Field label="Password" hint="Min 6 characters">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    minLength={6}
                    className={inputClass}
                  />
                </Field>

                {error ? <Callout tone="danger">{error}</Callout> : null}

                <Button
                  type="submit"
                  variant="primary"
                  className={cx('w-full', loading && 'opacity-80')}
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </Card>

            <button
              type="button"
              onClick={handleBack}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink/50 hover:text-ink transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to role selection
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink/50">
          Having trouble? Contact your admin to reset access.
        </p>
      </div>
    </Page>
  );
}
