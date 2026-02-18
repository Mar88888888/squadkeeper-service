import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class AttendanceRecordDto {
  @IsUUID()
  playerId: string;

  @IsBoolean()
  isPresent: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
