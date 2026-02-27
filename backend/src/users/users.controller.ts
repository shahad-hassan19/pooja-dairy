import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ShopIsolationGuard } from '../common/guards/shop-isolation.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  createUser(@CurrentUser() admin: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(admin, dto);
  }

  @Get(':shopId')
  @Roles(Role.ADMIN)
  @UseGuards(ShopIsolationGuard)
  getUsersByShop(@Param('shopId') shopId: string) {
    return this.usersService.getUsersByShop(shopId);
  }
}
