import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { AttendanceRecordDto } from './attendance-record.dto';
import { EventType } from '../../events/enums/event-type.enum';

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
