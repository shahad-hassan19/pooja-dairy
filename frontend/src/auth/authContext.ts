import { createContext } from 'react';
import type { JwtPayload, Role } from '../types';

export interface AuthState {
  user: JwtPayload | null;
  token: string | null;
  isReady: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

