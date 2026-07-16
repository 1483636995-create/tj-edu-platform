import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { ContentStatus, PaperType } from '../../../generated/prisma/client';

export class UpsertPaperDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsUUID()
  subjectId!: string;

  @IsUUID()
  gradeId!: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsEnum(PaperType)
  type: PaperType = PaperType.PRACTICE;

  @IsEnum(ContentStatus)
  status: ContentStatus = ContentStatus.DRAFT;

  @IsArray()
  @IsUUID('all', { each: true })
  questionIds: string[] = [];
}
