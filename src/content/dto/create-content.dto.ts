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

export class CreateContentDto {
  @IsString()
  title: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsInt()
  @Min(1888)
  @Max(new Date().getFullYear() + 5)
  releaseYear: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsString({ each: true })
  genres?: string[];
}
