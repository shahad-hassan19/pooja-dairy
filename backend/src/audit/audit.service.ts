import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Prisma } from '@prisma/client';

export interface AuditLogRecord {
  id: string;
  userId: string;
  shopId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    user: JwtPayload,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Prisma.JsonValue,
  ): Promise<AuditLogRecord> {
    const [result] = await this.prisma.$queryRaw<AuditLogRecord[]>`
      INSERT INTO "AuditLog" ("userId", "shopId", "action", "entity", "entityId", "metadata")
      VALUES (${user.sub}, ${user.shopId}, ${action}, ${entity}, ${entityId ?? null}, ${metadata ?? null})
      RETURNING *
    `;

    return result;
  }

  async getLogsForShop(shopId: string): Promise<AuditLogRecord[]> {
    return this.prisma.$queryRaw<AuditLogRecord[]>`
      SELECT *
      FROM "AuditLog"
      WHERE "shopId" = ${shopId}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `;
  }

  async getAllLogs(): Promise<AuditLogRecord[]> {
    return this.prisma.$queryRaw<AuditLogRecord[]>`
      SELECT *
      FROM "AuditLog"
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;
  }
}
