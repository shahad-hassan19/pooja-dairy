import { Role } from '@prisma/client';

export const PermissionMatrix = {
  BILLING: [Role.SALES, Role.ADMIN],
  STOCK_TRANSFER: [Role.STOCK_MANAGER, Role.ADMIN],
  REPORTS: [Role.ACCOUNTS, Role.ADMIN],
};
