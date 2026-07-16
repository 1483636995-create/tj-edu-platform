import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ContentStatus } from '../../../generated/prisma/client';

export class UpsertHandoutDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objective?: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsEnum(ContentStatus)
  status: ContentStatus = ContentStatus.DRAFT;

  @IsArray()
  @IsUUID('all', { each: true })
  knowledgePointIds: string[] = [];

  @IsArray()
  @IsUUID('all', { each: true })
  questionIds: string[] = [];

  @IsArray()
  @IsUUID('all', { each: true })
  fileAssetIds: string[] = [];
}
