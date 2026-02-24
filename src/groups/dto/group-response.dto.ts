import { Expose, Type } from 'class-transformer';
import { Position } from '../../players/enums/position.enum';

class GroupCoachDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

class GroupPlayerDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  position: Position;
}

export class GroupResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  yearOfBirth: number;

  @Expose()
  @Type(() => GroupCoachDto)
  headCoach: GroupCoachDto | null;

  @Expose()
  @Type(() => GroupCoachDto)
  assistants: GroupCoachDto[];

  @Expose()
  @Type(() => GroupPlayerDto)
  players: GroupPlayerDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
