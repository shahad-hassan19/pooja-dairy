import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { Item } from '@prisma/client';
import { AuditService } from 'src/audit/audit.service';

type ItemWithStock = Item & {
  currentStock: number;
};

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createItem(dto: CreateItemDto) {
    return this.prisma.item.create({
      data: {
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
        shopId: dto.shopId,
      },
    });
  }

  async getItems(shopId: string) {
    return this.prisma.item.findMany({
      where: { shopId },
    });
  }

  async adjustStock(user: JwtPayload, dto: AdjustStockDto) {
    // Security: ensure item belongs to shop
    const item = await this.prisma.item.findFirst({
      where: {
        id: dto.itemId,
        shopId: user.shopId,
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
    const items = await this.prisma.item.findMany({
      where: { shopId },
    });

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
