import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MasteryStatus } from '../../../generated/prisma/client';

export class UpdateMistakeDto {
  @IsOptional()
  @IsEnum(MasteryStatus)
  status?: MasteryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
