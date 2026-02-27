import { IsString, IsNumber, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  shopId: string;
}
