import { IsString, IsInt } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  itemId: string;

  @IsInt()
  change: number;

  @IsString()
  reason: string;

  @IsString()
  shopId: string;
}
