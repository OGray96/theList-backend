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

  @IsString()
  body: string;

  @IsDateString()
  dateReviewed: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
