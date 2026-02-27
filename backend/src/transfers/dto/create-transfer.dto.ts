import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemInput {
  @IsString()
  itemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateTransferDto {
  @IsString()
  fromShopId: string;

  @IsString()
  toShopId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemInput)
  items: TransferItemInput[];
}
