import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  contentItemId: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsDateString()
  dateReviewed?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
