import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { Shop } from '@prisma/client';

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  async createShop(dto: CreateShopDto): Promise<Shop> {
    if (dto.type === 'DISTRIBUTOR') {
      const existing = await this.prisma.shop.findFirst({
        where: { type: 'DISTRIBUTOR' },
      });

      if (existing) {
        throw new Error('Distributor already exists');
      }
    }

    return await this.prisma.shop.create({
      data: {
        name: dto.name,
        type: dto.type,
      },
    });
  }

  async getAllShops(): Promise<Shop[]> {
    return await this.prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteShop(id: string): Promise<Shop> {
    try {
      return await this.prisma.shop.delete({
        where: { id },
      });
    } catch (error) {
      console.log(error);
      throw new Error('Shop not found');
    }
  }
}
