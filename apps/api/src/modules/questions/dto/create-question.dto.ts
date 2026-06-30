import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';
import { ContentStatus, QuestionType } from '../../../generated/prisma/client';

export class CreateQuestionDto {
  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  stem!: string;

  @IsOptional()
  answer?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  analysis?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  knowledgePointIds?: string[];
}
