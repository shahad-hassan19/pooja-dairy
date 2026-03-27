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
    return await this.prisma.$transaction(
      async (tx) => {
        const fromShop = await tx.shop.findUnique({
          where: { id: dto.fromShopId },
        });

        const toShop = await tx.shop.findUnique({
          where: { id: dto.toShopId },
        });

        if (!fromShop || !toShop) {
          throw new BadRequestException('Invalid shops');
        }

        if (user.role !== 'ADMIN') {
          if (user.shopId !== dto.fromShopId) {
            throw new BadRequestException(
              'You can only create transfers from your own shop',
            );
          }
        }

        if (fromShop.type !== 'DISTRIBUTOR') {
          throw new BadRequestException('Source must be distributor');
        }

        if (toShop.type !== 'RETAIL') {
          throw new BadRequestException('Destination must be retail');
        }

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
            status: 'PENDING',
          },
        });

        for (const item of dto.items) {
          const distributorItem = await tx.item.findUnique({
            where: { id: item.itemId },
          });

          if (!distributorItem) {
            throw new BadRequestException(
              `Item ${item.itemId} not found at distributor`,
            );
          }

          await tx.transferItem.create({
            data: {
              transferId: transfer.id,
              itemId: item.itemId,
              quantity: item.quantity,
            },
          });

          await tx.stockLog.create({
            data: {
              shopId: dto.fromShopId,
              itemId: item.itemId,
              change: -item.quantity,
              reason: 'TRANSFER_OUT',
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
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }

  async incomingPending(user: JwtPayload) {
    const isAdmin = user.role === 'ADMIN';
    const where = isAdmin
      ? { status: 'PENDING' as const }
      : { status: 'PENDING' as const, toShopId: user.shopId };
    const transfers = await this.prisma.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
    return transfers;
  }

  async outgoing(user: JwtPayload) {
    // Admins see all transfers from any distributor; managers see transfers from their own shop
    const distributors = await this.prisma.shop.findMany({
      where: { type: 'DISTRIBUTOR' },
      select: { id: true },
    });
    const distributorIds = distributors.map((d) => d.id);
    const where =
      user.role === 'ADMIN'
        ? { fromShopId: { in: distributorIds } }
        : { fromShopId: user.shopId };
    return this.prisma.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async confirmTransfer(user: JwtPayload, transferId: string) {
    return await this.prisma.$transaction(
      async (tx) => {
        const transfer = await tx.transfer.findUnique({
          where: { id: transferId },
          include: { items: true },
        });
        if (!transfer) throw new BadRequestException('Transfer not found');
        if (transfer.status !== 'PENDING') {
          throw new BadRequestException('Transfer is not pending');
        }
        if (user.role !== 'SALES') {
          throw new BadRequestException('Only sales can confirm transfers');
        }
        if (transfer.toShopId !== user.shopId) {
          throw new BadRequestException('Not allowed to confirm this transfer');
        }

        for (const ti of transfer.items) {
          await tx.stockLog.create({
            data: {
              shopId: transfer.toShopId,
              itemId: ti.itemId,
              change: ti.quantity,
              reason: 'TRANSFER_IN',
              referenceId: transfer.id,
            },
          });
        }

        const updated = await tx.transfer.update({
          where: { id: transfer.id },
          data: { status: 'CONFIRMED' },
        });

        await this.auditService.logAction(
          user,
          'TRANSFER_CONFIRMED',
          'Transfer',
          transfer.id,
          { to: transfer.toShopId, itemsCount: transfer.items.length },
        );

        return updated;
      },
      { maxWait: 10000, timeout: 60000 },
    );
  }
}
