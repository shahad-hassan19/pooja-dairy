import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateItemDto } from './dto/create-item.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShopIsolationGuard } from '../common/guards/shop-isolation.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('item')
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  createItem(@Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Get(':shopId/items')
  @UseGuards(ShopIsolationGuard)
  getItems(@Param('shopId') shopId: string) {
    return this.inventoryService.getItems(shopId);
  }

  @Post('adjust')
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  adjustStock(@CurrentUser() user: JwtPayload, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user, dto);
  }

  @Get(':shopId/stock/:itemId')
  @UseGuards(ShopIsolationGuard)
  getStock(@Param('shopId') shopId: string, @Param('itemId') itemId: string) {
    return this.inventoryService.getCurrentStock(shopId, itemId);
  }

  @Get(':shopId/stock')
  @UseGuards(ShopIsolationGuard)
  getAllStock(@Param('shopId') shopId: string) {
    return this.inventoryService.getStockForAllItems(shopId);
  }
}
