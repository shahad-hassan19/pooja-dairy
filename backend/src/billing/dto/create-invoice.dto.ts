import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

class InvoiceItemInput {
  @IsString()
  itemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateInvoiceDto {
  @IsString()
  shopId: string;

  @IsIn(['Cash', 'Card', 'UPI'])
  paymentMethod: 'Cash' | 'Card' | 'UPI';

  @IsNumber()
  @Min(0)
  billNo: number;

  @IsDateString()
  billDate: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInput)
  items: InvoiceItemInput[];
}
