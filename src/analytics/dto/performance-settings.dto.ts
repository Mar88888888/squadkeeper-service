import { IsInt, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { Position } from '../../players/enums/position.enum';
import { PositionExpectations } from '../entities/performance-settings.entity';

export class UpdatePerformanceSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  skillWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  offenseWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  defenseWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  teamWeight?: number;

  @IsOptional()
  positionExpectations?: Partial<PositionExpectations>;
}

export interface PerformanceSettingsResponse {
  groupId: string;
  groupName: string;
  skillWeight: number;
  offenseWeight: number;
  defenseWeight: number;
  teamWeight: number;
  positionExpectations: PositionExpectations;
  isCustom: boolean;
}

export class CopySettingsDto {
  @IsUUID()
  sourceGroupId: string;
}
