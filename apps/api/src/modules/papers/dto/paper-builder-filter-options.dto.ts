import { IsOptional, IsUUID } from 'class-validator';

export class PaperBuilderFilterOptionsDto {
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  gradeId?: string;

  @IsOptional()
  @IsUUID()
  knowledgePointId?: string;
}
