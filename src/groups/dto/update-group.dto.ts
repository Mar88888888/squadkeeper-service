import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

const currentYear = new Date().getFullYear();

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(currentYear - 25, { message: `Year of birth must be at least ${currentYear - 25}` })
  @Max(currentYear - 3, { message: `Year of birth must be at most ${currentYear - 3}` })
  yearOfBirth?: number;
}
