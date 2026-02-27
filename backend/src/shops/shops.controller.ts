import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, Shop } from '@prisma/client';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Post()
  @Roles(Role.ADMIN)
  createShop(@Body() dto: CreateShopDto) {
    return this.shopsService.createShop(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  getAllShops() {
    return this.shopsService.getAllShops();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string): Promise<Shop> {
    return this.shopsService.deleteShop(id);
  }
}
