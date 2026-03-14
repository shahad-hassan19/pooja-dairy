import { useContext } from 'react';
import { ShopContext } from './shopContext';

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}

