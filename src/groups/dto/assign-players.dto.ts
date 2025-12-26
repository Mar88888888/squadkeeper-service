import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignPlayersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  playerIds: string[];
}
