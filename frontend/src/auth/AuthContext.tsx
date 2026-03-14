import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { parseJwtPayload } from './jwt';
import { apiPost } from '../api/client';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  );

  const user = useMemo(() => {
    if (!token) return null;
    try {
      return parseJwtPayload(token);
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    const onLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ accessToken: string; refreshToken: string }>(
      '/auth/login',
      { email, password }
    );
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    setToken(res.accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
  }, []);

  const hasRole = useCallback(
    (...roles: import('../types').Role[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isReady: true,
      login,
      logout,
      hasRole,
    }),
    [user, token, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
