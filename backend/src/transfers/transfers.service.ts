import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Transfer } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TransfersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createTransfer(
    user: JwtPayload,
    dto: CreateTransferDto,
  ): Promise<Transfer> {
    return await this.prisma.$transaction(async (tx) => {
      const fromShop = await tx.shop.findUnique({
        where: { id: dto.fromShopId },
      });

      const toShop = await tx.shop.findUnique({
        where: { id: dto.toShopId },
      });

      if (!fromShop || !toShop) {
        throw new BadRequestException('Invalid shops');
      }

      if (fromShop.type !== 'DISTRIBUTOR') {
        throw new BadRequestException('Source must be distributor');
      }

      if (toShop.type !== 'RETAIL') {
        throw new BadRequestException('Destination must be retail');
      }

      // Validate stock at distributor
      for (const item of dto.items) {
        const stock = await tx.stockLog.aggregate({
          where: {
            shopId: dto.fromShopId,
            itemId: item.itemId,
          },
          _sum: { change: true },
        });

        const currentStock = stock._sum.change ?? 0;

        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item ${item.itemId}`,
          );
        }
      }

      const transfer = await tx.transfer.create({
        data: {
          fromShopId: dto.fromShopId,
          toShopId: dto.toShopId,
          createdById: user.sub,
        },
      });

      for (const item of dto.items) {
        await tx.transferItem.create({
          data: {
            transferId: transfer.id,
            itemId: item.itemId,
            quantity: item.quantity,
          },
        });

        // Deduct from distributor
        await tx.stockLog.create({
          data: {
            shopId: dto.fromShopId,
            itemId: item.itemId,
            change: -item.quantity,
            reason: 'TRANSFER_OUT',
            referenceId: transfer.id,
          },
        });

        // Add to retail
        await tx.stockLog.create({
          data: {
            shopId: dto.toShopId,
            itemId: item.itemId,
            change: item.quantity,
            reason: 'TRANSFER_IN',
            referenceId: transfer.id,
          },
        });
      }

      await this.auditService.logAction(
        user,
        'TRANSFER_CREATED',
        'Transfer',
        transfer.id,
        {
          from: dto.fromShopId,
          to: dto.toShopId,
          itemsCount: dto.items.length,
        },
      );

      return transfer;
    });
  }
}
