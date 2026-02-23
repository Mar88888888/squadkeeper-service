import { Expose, Transform, Type } from 'class-transformer';
import { GameFormat } from '../entities/game-format.enum';
import { Position } from '../../players/enums/position.enum';

class PositionPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  position: Position;
}

class SquadPositionResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => PositionPlayerDto)
  player: PositionPlayerDto | null;

  @Expose()
  role: Position;

  @Expose()
  isStarter: boolean;

  @Expose()
  orderIndex: number;
}

class SquadGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

class SquadCreatedByDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

export class SquadResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  gameFormat: GameFormat;

  @Expose()
  @Type(() => SquadGroupDto)
  group: SquadGroupDto;

  @Expose()
  @Type(() => SquadCreatedByDto)
  createdBy: SquadCreatedByDto | null;

  @Expose()
  @Type(() => SquadPositionResponseDto)
  positions: SquadPositionResponseDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
