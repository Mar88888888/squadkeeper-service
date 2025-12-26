import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { AttendanceRecordDto } from './attendance-record.dto';

export enum EventType {
  TRAINING = 'TRAINING',
  MATCH = 'MATCH',
}

export class MarkAttendanceBatchDto {
  @IsUUID()
  eventId: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
