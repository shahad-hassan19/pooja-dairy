import { IsString, IsEnum } from 'class-validator';
import { ShopType } from '@prisma/client';

export class CreateShopDto {
  @IsString()
  name: string;

  @IsEnum(ShopType)
  type: ShopType;
}
