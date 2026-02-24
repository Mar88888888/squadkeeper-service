import { Expose, Transform, Type } from 'class-transformer';
import { Position } from '../enums/position.enum';
import { StrongFoot } from '../enums/strong-foot.enum';

class PlayerUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;
}

class PlayerGroupDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

class PlayerParentDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

export class PlayerResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phoneNumber: string | null;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.dateOfBirth) return null;
    if (obj.dateOfBirth instanceof Date) {
      return obj.dateOfBirth.toISOString().split('T')[0];
    }
    return String(obj.dateOfBirth).split('T')[0];
  })
  dateOfBirth: string | null;

  @Expose()
  position: Position;

  @Expose()
  height: number;

  @Expose()
  weight: number;

  @Expose()
  strongFoot: StrongFoot;

  @Expose()
  @Type(() => PlayerUserDto)
  user: PlayerUserDto;

  @Expose()
  @Type(() => PlayerGroupDto)
  group: PlayerGroupDto | null;

  @Expose()
  @Type(() => PlayerParentDto)
  parent: PlayerParentDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
