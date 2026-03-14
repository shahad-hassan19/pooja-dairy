import { createContext } from 'react';
import type { Shop } from '../types';

export interface ShopContextValue {
  shopId: string | null;
  shops: Shop[];
  setShopId: (id: string) => void;
  isAdmin: boolean;
}

export const ShopContext = createContext<ShopContextValue | null>(null);

