import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { ContentType } from '../entities/content-item.entity';

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @IsOptional()
  @IsInt()
  @Min(1888)
  @Max(new Date().getFullYear() + 5)
  releaseYear?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  coverImageUrl?: string;

  @IsOptional()
  @IsString({ each: true })
  genres?: string[];
}
