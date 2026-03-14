import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { apiGet } from '../api/client';
import type { Shop } from '../types';
import { ShopContext, type ShopContextValue } from './shopContext';

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAdmin = hasRole('ADMIN');
  const userSub = user?.sub;

  useEffect(() => {
    if (!isAdmin || !userSub) return;
    apiGet<Shop[]>('/shops')
      .then((list) => {
        setShops(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev ?? list[0].id);
        }
      })
      .catch(() => {});
  }, [isAdmin, userSub]);

  const effectiveShopId = isAdmin ? selectedId : user?.shopId ?? null;
  const setShopId = useCallback((id: string) => setSelectedId(id), []);

  const value = useMemo<ShopContextValue>(
    () => ({
      shopId: effectiveShopId,
      shops,
      setShopId,
      isAdmin,
    }),
    [effectiveShopId, shops, setShopId, isAdmin]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
