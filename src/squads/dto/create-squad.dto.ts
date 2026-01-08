import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameFormat } from '../entities/game-format.enum';
import { SquadPositionDto } from './squad-position.dto';

export class CreateSquadDto {
  @IsString()
  name: string;

  @IsEnum(GameFormat)
  gameFormat: GameFormat;

  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SquadPositionDto)
  positions?: SquadPositionDto[];
}
