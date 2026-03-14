import type { JwtPayload, Role } from '../types';

export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.sub || !payload.role || !payload.shopId) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      shopId: payload.shopId,
    };
  } catch {
    return null;
  }
}
