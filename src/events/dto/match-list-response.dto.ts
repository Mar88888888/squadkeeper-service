import { Expose, Type } from 'class-transformer';
import { MatchResponseDto } from './match-response.dto';

export class MatchListResponseDto {
  @Expose()
  @Type(() => MatchResponseDto)
  items: MatchResponseDto[];

  @Expose()
  total: number;
}

