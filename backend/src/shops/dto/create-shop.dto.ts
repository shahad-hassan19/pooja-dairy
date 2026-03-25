import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ShopType } from '@prisma/client';

export class CreateShopDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(ShopType)
  type: ShopType;
}
