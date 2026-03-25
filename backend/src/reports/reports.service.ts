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

  private getPeriodRange(period: string): { current: Date; previous: Date } {
    const now = new Date();
    const current = new Date(now);
    const previous = new Date(now);

    switch (period) {
      case 'weekly':
        current.setDate(current.getDate() - 7);
        current.setHours(0, 0, 0, 0);
        previous.setDate(previous.getDate() - 14);
        previous.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        current.setDate(1);
        current.setHours(0, 0, 0, 0);
        previous.setMonth(previous.getMonth() - 1, 1);
        previous.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        current.setMonth(0, 1);
        current.setHours(0, 0, 0, 0);
        previous.setFullYear(previous.getFullYear() - 1, 0, 1);
        previous.setHours(0, 0, 0, 0);
        break;
      default: // today
        current.setHours(0, 0, 0, 0);
        previous.setDate(previous.getDate() - 1);
        previous.setHours(0, 0, 0, 0);
        break;
    }
    return { current, previous };
  }

  async getDashboardSummary(period: string = 'today') {
    const shops = await this.prisma.shop.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const { current: periodStart, previous: prevStart } = this.getPeriodRange(period);
    const now = new Date();

    const summaries = await Promise.all(
      shops.map(async (shop) => {
        // Current period revenue
        const revenue = await this.prisma.invoice.aggregate({
          where: { shopId: shop.id, createdAt: { gte: periodStart } },
          _sum: { total: true },
          _count: { id: true },
        });

        // Previous period revenue (for delta comparison)
        const prevRevenue = await this.prisma.invoice.aggregate({
          where: {
            shopId: shop.id,
            createdAt: { gte: prevStart, lt: periodStart },
          },
          _sum: { total: true },
          _count: { id: true },
        });

        const stockItems = await this.prisma.stockLog.groupBy({
          by: ['itemId'],
          where: { shopId: shop.id },
          _sum: { change: true },
        });

        const totalStock = stockItems.reduce(
          (sum, s) => sum + (s._sum.change ?? 0),
          0,
        );

        const currentRev = Number(revenue._sum.total ?? 0);
        const prevRev = Number(prevRevenue._sum.total ?? 0);
        const delta = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : currentRev > 0 ? 100 : 0;

        return {
          shopId: shop.id,
          shopName: shop.name,
          location: shop.location,
          type: shop.type,
          revenue: currentRev,
          invoices: revenue._count.id,
          prevRevenue: prevRev,
          prevInvoices: prevRevenue._count.id,
          delta: Math.round(delta * 10) / 10,
          totalStock,
          itemCount: stockItems.length,
          period,
        };
      }),
    );

    return summaries;
  }

  async getSalesTrendByShop(period: string = 'weekly') {
    const shops = await this.prisma.shop.findMany({
      select: { id: true },
    });

    const now = new Date();
    let startDate: Date;
    let bucketFn: (d: Date) => string;
    let prefill: () => Record<string, number>;

    switch (period) {
      case 'today': {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        // Hourly buckets: full 24h, collapsed to 3-hour windows
        bucketFn = (d) => {
          const h = Math.floor(d.getHours() / 3) * 3;
          return `${h.toString().padStart(2, '0')}:00`;
        };
        prefill = () => {
          const m: Record<string, number> = {};
          for (let h = 0; h < 24; h += 3) m[`${h.toString().padStart(2, '0')}:00`] = 0;
          return m;
        };
        break;
      }
      case 'monthly': {
        startDate = new Date(now);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        bucketFn = (d) => d.toISOString().split('T')[0];
        prefill = () => {
          const m: Record<string, number> = {};
          const d = new Date(startDate);
          while (d <= now) {
            m[d.toISOString().split('T')[0]] = 0;
            d.setDate(d.getDate() + 1);
          }
          return m;
        };
        break;
      }
      case 'yearly': {
        startDate = new Date(now);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        // Monthly buckets
        bucketFn = (d) => {
          const y = d.getFullYear();
          const m = (d.getMonth() + 1).toString().padStart(2, '0');
          return `${y}-${m}`;
        };
        prefill = () => {
          const m: Record<string, number> = {};
          for (let mo = 0; mo <= now.getMonth(); mo++) {
            const key = `${now.getFullYear()}-${(mo + 1).toString().padStart(2, '0')}`;
            m[key] = 0;
          }
          return m;
        };
        break;
      }
      default: {
        // weekly — daily buckets
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        bucketFn = (d) => d.toISOString().split('T')[0];
        prefill = () => {
          const m: Record<string, number> = {};
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            m[d.toISOString().split('T')[0]] = 0;
          }
          return m;
        };
        break;
      }
    }

    const result: Record<string, Record<string, number>> = {};

    for (const shop of shops) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          shopId: shop.id,
          createdAt: { gte: startDate },
        },
        select: { createdAt: true, total: true },
      });

      const trend = prefill();

      invoices.forEach((inv) => {
        const key = bucketFn(inv.createdAt);
        if (key in trend) {
          trend[key] = (trend[key] || 0) + Number(inv.total);
        }
      });

      result[shop.id] = trend;
    }

    return result;
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

  async getShopInventoryIntelligence(shopId: string) {
    // 1. Get all items for this shop
    const items = await this.prisma.item.findMany({
      where: { shopId },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const itemIds = items.map((i) => i.id);

    // 2. Top sellers — from InvoiceItem via invoices for this shop
    const invoicesForShop = await this.prisma.invoice.findMany({
      where: { shopId },
      select: { id: true },
    });
    const invoiceIds = invoicesForShop.map((i) => i.id);

    const soldByItem = await this.prisma.invoiceItem.groupBy({
      by: ['itemId'],
      where: { invoiceId: { in: invoiceIds } },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    const totalSoldQty = soldByItem.reduce(
      (s, r) => s + (r._sum.quantity ?? 0),
      0,
    );

    const topSellers = soldByItem.slice(0, 10).map((r) => {
      const item = itemMap.get(r.itemId);
      return {
        itemId: r.itemId,
        itemName: item?.name ?? r.itemId,
        totalSold: r._sum.quantity ?? 0,
        revenue: Number(r._sum.price ?? 0) * (r._sum.quantity ?? 0),
        pctOfTotal:
          totalSoldQty > 0
            ? Math.round(
                ((r._sum.quantity ?? 0) / totalSoldQty) * 1000,
              ) / 10
            : 0,
      };
    });

    // 3. Frequent dispatches — transfers OUT from this shop (with item names)
    const transfersOut = await this.prisma.transfer.findMany({
      where: { fromShopId: shopId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    // Also get transfers IN
    const transfersIn = await this.prisma.transfer.findMany({
      where: { toShopId: shopId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const dispatchMap: Record<string, { count: number; totalQty: number }> = {};
    for (const t of transfersOut) {
      for (const ti of t.items) {
        if (!dispatchMap[ti.itemId]) dispatchMap[ti.itemId] = { count: 0, totalQty: 0 };
        dispatchMap[ti.itemId].count += 1;
        dispatchMap[ti.itemId].totalQty += ti.quantity;
      }
    }

    const frequentDispatches = Object.entries(dispatchMap)
      .map(([itemId, d]) => ({
        itemId,
        itemName: itemMap.get(itemId)?.name ?? itemId,
        dispatchCount: d.count,
        totalQty: d.totalQty,
      }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);

    // 4. Stock reconciliation per item
    // Logic: currentStock (from StockLog) is the ground truth.
    // We break down: stockIn (all positive logs) vs stockOut (all negative logs)
    // Then compare stockOut against invoiced sales to find unexplained losses.
    const stockLogs = await this.prisma.stockLog.findMany({
      where: { shopId, itemId: { in: itemIds } },
    });

    const logsByItem: Record<string, {
      stockIn: number; saleDeductions: number; transferOut: number; otherOut: number; currentStock: number;
    }> = {};

    for (const id of itemIds) {
      logsByItem[id] = { stockIn: 0, saleDeductions: 0, transferOut: 0, otherOut: 0, currentStock: 0 };
    }

    for (const log of stockLogs) {
      const entry = logsByItem[log.itemId];
      if (!entry) continue;
      entry.currentStock += log.change;

      if (log.change > 0) {
        entry.stockIn += log.change;
      } else {
        const reason = log.reason.toLowerCase();
        if (reason === 'transfer_out') {
          entry.transferOut += Math.abs(log.change);
        } else if (reason === 'sales' || reason === 'sale') {
          entry.saleDeductions += Math.abs(log.change);
        } else {
          // wastage, damaged, unaccounted, missing, etc.
          entry.otherOut += Math.abs(log.change);
        }
      }
    }

    const soldMap: Record<string, number> = {};
    for (const r of soldByItem) {
      soldMap[r.itemId] = r._sum.quantity ?? 0;
    }

    const reconciliation = itemIds.map((itemId) => {
      const item = itemMap.get(itemId);
      const l = logsByItem[itemId];
      const invoicedSold = soldMap[itemId] ?? 0;
      // Unaccounted = invoiced sales that weren't deducted from stock + other unexplained outflow
      const unaccounted = l.otherOut + (invoicedSold - l.saleDeductions);
      const absUnaccounted = Math.abs(unaccounted);

      return {
        itemId,
        itemName: item?.name ?? itemId,
        price: Number(item?.price ?? 0),
        stockIn: l.stockIn,
        invoicedSold,
        saleDeductions: l.saleDeductions,
        transferOut: l.transferOut,
        otherLoss: l.otherOut,
        currentStock: l.currentStock,
        unaccounted,
        flag: absUnaccounted === 0 ? 'ok' : absUnaccounted <= 5 ? 'warning' : ('critical' as const),
      };
    });

    const flagOrder = { critical: 0, warning: 1, ok: 2 };
    reconciliation.sort(
      (a, b) => flagOrder[a.flag] - flagOrder[b.flag] || Math.abs(b.unaccounted) - Math.abs(a.unaccounted),
    );

    const flaggedItems = reconciliation.filter((r) => r.flag !== 'ok').length;
    const totalVarianceValue = reconciliation.reduce(
      (s, r) => s + Math.abs(r.unaccounted) * r.price, 0,
    );

    // 5. Peak hours analysis
    const allInvoices = await this.prisma.invoice.findMany({
      where: { shopId },
      select: { createdAt: true, total: true },
    });

    const hourlyRevenue: Record<number, { count: number; revenue: number }> = {};
    const dailyRevenue: Record<number, { count: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) hourlyRevenue[h] = { count: 0, revenue: 0 };
    for (let d = 0; d < 7; d++) dailyRevenue[d] = { count: 0, revenue: 0 };

    for (const inv of allInvoices) {
      const h = inv.createdAt.getHours();
      const d = inv.createdAt.getDay(); // 0=Sun, 6=Sat
      hourlyRevenue[h].count += 1;
      hourlyRevenue[h].revenue += Number(inv.total);
      dailyRevenue[d].count += 1;
      dailyRevenue[d].revenue += Number(inv.total);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const peakHours = Object.entries(hourlyRevenue)
      .map(([h, d]) => ({ hour: parseInt(h), ...d }))
      .filter((h) => h.count > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((h) => ({
        label: h.hour < 12 ? `${h.hour || 12}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`,
        orders: h.count,
        revenue: h.revenue,
      }));

    const peakDays = Object.entries(dailyRevenue)
      .map(([d, data]) => ({ day: dayNames[parseInt(d)], ...data }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.revenue - a.revenue);

    return {
      topSellers,
      frequentDispatches,
      reconciliation,
      peakHours,
      peakDays,
      summary: {
        totalItems: items.length,
        totalStock: reconciliation.reduce((s, r) => s + r.currentStock, 0),
        flaggedItems,
        totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
      },
    };
  }
}
