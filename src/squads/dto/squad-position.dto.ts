import {
  IsUUID,
  IsBoolean,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { Position } from '../../players/enums/position.enum';

export class SquadPositionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  playerId?: string | null;

  @IsEnum(Position)
  role: Position;

  @IsBoolean()
  isStarter: boolean;

  @IsInt()
  @Min(0)
  orderIndex: number;
}
