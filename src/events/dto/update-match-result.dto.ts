import { IsInt, Min } from 'class-validator';

export class UpdateMatchResultDto {
  @IsInt()
  @Min(0)
  homeGoals: number;

  @IsInt()
  @Min(0)
  awayGoals: number;
}
