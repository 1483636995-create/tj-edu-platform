import { IsOptional, IsUUID } from 'class-validator';

export class HandoutFilterOptionsDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;
}
