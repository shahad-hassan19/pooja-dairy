import * as bcrypt from 'bcrypt';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateRefreshToken(userId: string, token: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  async createUser(admin: JwtPayload, dto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword: string = await bcrypt.hash(dto.password, 12);

    const data: Prisma.UserUncheckedCreateInput = {
      name: dto.name,
      email: dto.email,
      passwordHash: hashedPassword,
      role: dto.role,
      shopId: dto.shopId,
    };
    const user: User = await this.prisma.user.create({ data });

    await this.auditService.logAction(admin, 'USER_CREATED', 'User', user.id, {
      createdUserEmail: user.email,
      role: user.role,
      shopId: user.shopId,
    });

    return user;
  }

  async getUsersByShop(shopId: string) {
    return this.prisma.user.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
