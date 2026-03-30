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

export type TransferStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export interface TransferItem {
  id: string;
  transferId: string;
  itemId: string;
  quantity: number;
}
export interface Transfer {
  id: string;
  fromShopId: string;
  toShopId: string;
  createdById: string;
  createdAt: string;
  status: TransferStatus;
  items: TransferItem[];
}

export type NotificationType = 'TRANSFER_CONFIRM_REQUIRED' | 'TRANSFER_CONFIRMED_ACK';
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  transferId?: string | null;
  fromShopId?: string | null;
  toShopId?: string | null;
  createdAt: string;
  readAt?: string | null;
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
