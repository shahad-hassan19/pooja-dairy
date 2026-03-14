import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Callout, Page } from '../components/ui/Page';
import { Field, inputClass } from '../components/ui/Field';
import { cx } from '../lib/cx';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isReady, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (user && isReady) return <Navigate to={from} replace />;

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

  return (
    <Page className="min-h-[calc(100vh-56px)] flex items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-cream-dark bg-cream-light px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-sm font-semibold text-ink">Pooja Dairy</span>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-ink/60">Use your account credentials to continue.</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
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

        <p className="mt-6 text-center text-xs text-ink/50">
          Having trouble? Contact your admin to reset access.
        </p>
      </div>
    </Page>
  );
}
