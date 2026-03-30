import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Item } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

type ItemWithStock = Item & {
  currentStock: number;
};

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getItemsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async createItem(dto: CreateItemDto) {
    // Items are global per SKU. Transfers should not create a new row per shop.
    // If duplicates already exist in the DB, we will reuse the first one we find.
    const existing = await this.prisma.item.findFirst({
      where: { sku: dto.sku },
      orderBy: { id: 'asc' },
    });

    if (existing) {
      // Price should be identical for the same SKU (per business rule).
      // If it isn't, block to avoid silently corrupting future calculations.
      if (existing.price.toNumber() !== dto.price) {
        throw new BadRequestException(
          `SKU ${dto.sku} already exists with different price`,
        );
      }

      return existing;
    }

    return this.prisma.item.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
        // Keep for backwards compatibility with older code/data.
        shopId: dto.shopId,
      },
    });
  }

  async getItems(shopId: string) {
    // Return items relevant to this shop:
    // - items created for the shop (legacy behaviour)
    // - items that have stock movement for the shop (works with canonical/global items)
    const [directItems, logs] = await Promise.all([
      this.prisma.item.findMany({
        where: { shopId },
        select: { id: true },
      }),
      this.prisma.stockLog.findMany({
        where: { shopId },
        select: { itemId: true },
        distinct: ['itemId'],
      }),
    ]);

    const itemIdSet = new Set<string>([
      ...directItems.map((i) => i.id),
      ...logs.map((l) => l.itemId),
    ]);

    const itemIds = Array.from(itemIdSet);
    if (itemIds.length === 0) return [];

    return this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      orderBy: { name: 'asc' },
    });
  }

  async adjustStock(user: JwtPayload, dto: AdjustStockDto) {
    // Security: guard already ensures users can only operate on their shop.
    // For global SKU items, we don't require Item.shopId to match the user shop.
    if (user.role !== 'ADMIN' && user.role !== 'STOCK_MANAGER') {
      throw new ForbiddenException('Not allowed to adjust stock');
    }

    const item = await this.prisma.item.findFirst({
      where: {
        id: dto.itemId,
      },
    });

    if (!item) {
      throw new BadRequestException('Item not found');
    }

    const log = await this.prisma.stockLog.create({
      data: {
        itemId: dto.itemId,
        shopId: user.shopId,
        change: dto.change,
        reason: dto.reason,
      },
    });

    await this.auditService.logAction(
      user,
      'STOCK_ADJUSTMENT',
      'Item',
      item.id,
      {
        change: dto.change,
        reason: dto.reason,
      },
    );

    return log;
  }

  async getCurrentStock(shopId: string, itemId: string) {
    const result = await this.prisma.stockLog.aggregate({
      where: {
        shopId,
        itemId,
      },
      _sum: {
        change: true,
      },
    });

    return result._sum.change ?? 0;
  }

  async getStockForAllItems(shopId: string) {
    const items = await this.getItems(shopId);

    const stockData: ItemWithStock[] = [];

    for (const item of items) {
      const stock = await this.getCurrentStock(shopId, item.id);

      stockData.push({
        ...item,
        currentStock: stock,
      });
    }

    return stockData;
  }
}
