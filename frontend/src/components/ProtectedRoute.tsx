import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-[60vh] px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-cream-dark bg-cream-light px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <p className="text-sm text-ink/70">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
