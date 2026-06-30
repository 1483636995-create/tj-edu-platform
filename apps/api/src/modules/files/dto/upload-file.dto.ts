import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { FileCategory } from '../../../generated/prisma/client';

function parseIds(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
}

export class UploadFileDto {
  @IsEnum(FileCategory)
  category!: FileCategory;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @Transform(({ value }) => parseIds(value))
  @IsArray()
  @IsUUID('4', { each: true })
  knowledgePointIds?: string[];
}
