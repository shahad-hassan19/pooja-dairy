import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Callout, Page } from '../components/ui/Page';
import { Field, inputClass } from '../components/ui/Field';
import { cx } from '../lib/cx';
import { Spinner } from '../components/ui/Spinner';

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
  const [showPassword, setShowPassword] = useState(false)
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
          <a href="/" className="flex items-center justify-center mb-5">
            <img src="/pooja-dairy-logo.svg" width={240} height={120} className="" alt="Pooja-Dairy-Logo"  />
          </a>

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
                  <div className="relative">
                <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                  required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      minLength={6}
                      className={inputClass}
                    />
                    <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AE9786] hover:text-[#7B5642] transition-colors h-5 w-5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {
                    showPassword ?
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" strokeWidth="0">
                        </g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                        </g>
                        <g id="SVGRepo_iconCarrier">
                          <path d="M15.0007 12C15.0007 13.6569 13.6576 15 12.0007 15C10.3439 15 9.00073 13.6569 9.00073 12C9.00073 10.3431 10.3439 9 12.0007 9C13.6576 9 15.0007 10.3431 15.0007 12Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          </path>
                          <path d="M12.0012 5C7.52354 5 3.73326 7.94288 2.45898 12C3.73324 16.0571 7.52354 19 12.0012 19C16.4788 19 20.2691 16.0571 21.5434 12C20.2691 7.94291 16.4788 5 12.0012 5Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          </path>
                        </g>
                      </svg> :
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" strokeWidth="0">
                        </g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round">
                        </g>
                        <g id="SVGRepo_iconCarrier">
                          <path d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          </path>
                        </g>
                      </svg>
                    }
                </button>
              </div>
            </Field>

                {error ? <Callout tone="danger">{error}</Callout> : null}

                <Button
                  type="submit"
                  variant="primary"
                  className={cx('w-full')}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      <span>Signing in…</span>
                    </span>
                  ) : (
                    'Sign in'
                  )}
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
