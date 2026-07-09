import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from 'class-validator';
import { LessonStatus, LessonType } from '../../../generated/prisma/client';

export class CreateLessonDto {
  @IsUUID()
  timetableId!: string;

  @IsUUID()
  teacherId!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsEnum(LessonType)
  type: LessonType = LessonType.GROUP;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  classroom?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsEnum(LessonStatus)
  status: LessonStatus = LessonStatus.SCHEDULED;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds: string[] = [];
}
