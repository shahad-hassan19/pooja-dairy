import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Invoice } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createInvoice(
    user: JwtPayload,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    if (user.shopId !== dto.shopId && user.role !== 'ADMIN') {
      throw new BadRequestException('Shop mismatch');
    }

    return await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({
        where: { id: dto.shopId },
      });

      if (!shop) {
        throw new BadRequestException('Shop not found');
      }

      if (shop.type !== 'RETAIL') {
        throw new BadRequestException(
          'Only retail shops can create customer invoices',
        );
      }

      // Validate stock
      for (const item of dto.items) {
        const stock = await tx.stockLog.aggregate({
          where: {
            shopId: dto.shopId,
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

      // Calculate total
      const total = dto.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const billDate = new Date(dto.billDate);
      if (Number.isNaN(billDate.getTime())) {
        throw new BadRequestException('Invalid billDate');
      }

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          number: `${dto.shopId}-${billDate.toISOString().slice(0, 10)}-${dto.billNo}`,
          shopId: dto.shopId,
          billNo: dto.billNo,
          billDate,
          paymentMethod: dto.paymentMethod,
          partyName: dto.partyName,
          phoneNo: dto.phoneNo,
          total,
          createdById: user.sub,
        },
      });

      // Create invoice items + stock deduction
      for (const item of dto.items) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemId: item.itemId,
            quantity: item.quantity,
            price: item.price,
          },
        });

        await tx.stockLog.create({
          data: {
            shopId: dto.shopId,
            itemId: item.itemId,
            change: -item.quantity,
            reason: 'SALE',
            referenceId: invoice.id,
          },
        });
      }

      await this.auditService.logAction(
        user,
        'INVOICE_CREATED',
        'Invoice',
        invoice.id,
        {
          total,
          itemsCount: dto.items.length,
        },
      );

      return invoice;
    });
  }
}
