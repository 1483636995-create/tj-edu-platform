import { IsOptional, IsUUID } from 'class-validator';

export class FileFilterOptionsDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;
}
