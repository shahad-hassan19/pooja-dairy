import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShopIsolationGuard } from '../common/guards/shop-isolation.guard';
import { DateRangeDto } from './dto/date-range.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get(':shopId/sales')
  @Roles(Role.ACCOUNTS, Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  getSales(@Param('shopId') shopId: string, @Query() dto: DateRangeDto) {
    return this.reportsService.getSalesSummary(shopId, dto);
  }

  @Get(':shopId/stock')
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  getStock(@Param('shopId') shopId: string) {
    return this.reportsService.getStockSummary(shopId);
  }

  @Get(':shopId/transfers')
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  getTransfers(@Param('shopId') shopId: string) {
    return this.reportsService.getTransferSummary(shopId);
  }

  @Get('admin/global-revenue')
  @Roles(Role.ADMIN)
  getGlobalRevenue() {
    return this.reportsService.getGlobalRevenue();
  }

  @Get('admin/revenue-by-shop')
  @Roles(Role.ADMIN)
  getRevenueByShop() {
    return this.reportsService.getRevenueByShop();
  }

  @Get('admin/top-items')
  @Roles(Role.ADMIN)
  getTopItems() {
    return this.reportsService.getTopSellingItems();
  }

  @Get('admin/low-stock')
  @Roles(Role.ADMIN)
  getLowStock() {
    return this.reportsService.getLowStockAlerts();
  }

  @Get('admin/sales-trend')
  @Roles(Role.ADMIN)
  getSalesTrend() {
    return this.reportsService.getDailySalesTrend();
  }

  @Get('admin/transfers')
  @Roles(Role.ADMIN)
  getTransfersOverview() {
    return this.reportsService.getTransferOverview();
  }
}
