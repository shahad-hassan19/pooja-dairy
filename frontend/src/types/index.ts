export type Role = 'ADMIN' | 'SALES' | 'STOCK_MANAGER' | 'ACCOUNTS';
export type ShopType = 'DISTRIBUTOR' | 'RETAIL';

export interface Shop {
  id: string;
  name: string;
  location?: string;
  type: ShopType;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  shopId: string;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  price: string;
  shopId: string;
}

export interface StockEntry {
  itemId: string;
  item?: Item;
  currentStock: number;
}

export interface InvoiceItemInput {
  itemId: string;
  quantity: number;
  price: number;
}

export interface TransferItemInput {
  itemId: string;
  quantity: number;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  shopId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  shopId: string;
}
