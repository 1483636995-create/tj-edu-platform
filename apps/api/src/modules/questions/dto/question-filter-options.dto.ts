import { IsOptional, IsUUID } from 'class-validator';

export class QuestionFilterOptionsDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;
}
