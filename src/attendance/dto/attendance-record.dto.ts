import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AttendanceRecordDto {
  @IsUUID()
  playerId: string;

  @IsBoolean()
  isPresent: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
