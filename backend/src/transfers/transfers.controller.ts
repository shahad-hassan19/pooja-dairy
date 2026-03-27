import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Post()
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  createTransfer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.createTransfer(user, dto);
  }

  @Get('pending')
  incomingPending(@CurrentUser() user: JwtPayload) {
    return this.transfersService.incomingPending(user);
  }

  @Get('outgoing')
  @Roles(Role.STOCK_MANAGER, Role.ADMIN)
  outgoing(@CurrentUser() user: JwtPayload) {
    return this.transfersService.outgoing(user);
  }

  @Post(':id/confirm')
  @Roles(Role.SALES)
  confirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transfersService.confirmTransfer(user, id);
  }
}
