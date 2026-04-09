import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsDateString()
  dateReviewed?: string;
}
