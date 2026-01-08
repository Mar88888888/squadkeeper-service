import { IsString, IsEnum, IsOptional } from 'class-validator';
import { GameFormat } from '../entities/game-format.enum';

export class UpdateSquadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(GameFormat)
  gameFormat?: GameFormat;
}
