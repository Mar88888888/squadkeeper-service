import { IsDate, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTrainingDto {
  @IsString()
  groupId: string;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  topic?: string;
}
