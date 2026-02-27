import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeDto } from './dto/date-range.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private buildDateFilter(
    shopId: string,
    dto: DateRangeDto,
  ): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      shopId,
    };

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};

      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }

      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    return where;
  }

  async getSalesSummary(shopId: string, dto: DateRangeDto) {
    const where = this.buildDateFilter(shopId, dto);

    const result = await this.prisma.invoice.aggregate({
      where,
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      totalRevenue: result._sum.total ?? 0,
      totalInvoices: result._count.id,
    };
  }

  async getStockSummary(shopId: string) {
    const grouped = await this.prisma.stockLog.groupBy({
      by: ['itemId'],
      where: { shopId },
      _sum: { change: true },
    });

    return grouped.map((g) => ({
      itemId: g.itemId,
      currentStock: g._sum.change ?? 0,
    }));
  }

  async getTransferSummary(shopId: string): Promise<{
    transfersSent: number;
    transfersReceived: number;
  }> {
    const sent: number = await this.prisma.transfer.count({
      where: { fromShopId: shopId },
    });

    const received: number = await this.prisma.transfer.count({
      where: { toShopId: shopId },
    });

    return {
      transfersSent: sent,
      transfersReceived: received,
    };
  }

  async getGlobalRevenue() {
    const result = await this.prisma.invoice.aggregate({
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      totalRevenue: result._sum.total ?? 0,
      totalInvoices: result._count.id,
    };
  }

  async getRevenueByShop() {
    const grouped = await this.prisma.invoice.groupBy({
      by: ['shopId'],
      _sum: { total: true },
    });

    return grouped.map((g) => ({
      shopId: g.shopId,
      revenue: g._sum.total ?? 0,
    }));
  }

  async getTopSellingItems(limit = 5) {
    const grouped = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: limit,
    });

    return grouped.map((g) => ({
      itemId: g.itemId,
      totalSold: g._sum.quantity ?? 0,
    }));
  }

  async getLowStockAlerts(threshold = 10) {
    const grouped = await this.prisma.stockLog.groupBy({
      by: ['shopId', 'itemId'],
      _sum: { change: true },
    });

    return grouped
      .map((g) => ({
        shopId: g.shopId,
        itemId: g.itemId,
        currentStock: g._sum.change ?? 0,
      }))
      .filter((item) => item.currentStock <= threshold);
  }

  async getDailySalesTrend(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const trend: Record<string, number> = {};

    invoices.forEach((inv) => {
      const date = inv.createdAt.toISOString().split('T')[0];

      trend[date] = (trend[date] || 0) + Number(inv.total);
    });

    return trend;
  }

  async getTransferOverview() {
    const totalTransfers = await this.prisma.transfer.count();

    const recentTransfers = await this.prisma.transfer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalTransfers,
      recentTransfers,
    };
  }
}
