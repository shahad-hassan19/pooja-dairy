import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService, AuditLogRecord } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShopIsolationGuard } from '../common/guards/shop-isolation.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get(':shopId')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @UseGuards(ShopIsolationGuard)
  getShopLogs(@Param('shopId') shopId: string): Promise<AuditLogRecord[]> {
    return this.auditService.getLogsForShop(shopId);
  }

  @Get()
  @Roles(Role.ADMIN)
  getAllLogs(): Promise<AuditLogRecord[]> {
    return this.auditService.getAllLogs();
  }
}
