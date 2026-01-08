import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SquadPositionDto } from './squad-position.dto';

export class UpdatePositionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SquadPositionDto)
  positions: SquadPositionDto[];
}
