import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTimetableDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
