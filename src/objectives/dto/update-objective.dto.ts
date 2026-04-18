import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupObjectiveDto } from './create-group-objective.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ObjectiveStatus } from '../enums/objective-status.enum';

export class UpdateObjectiveDto extends PartialType(CreateGroupObjectiveDto) {
  @IsOptional()
  @IsEnum(ObjectiveStatus)
  status?: ObjectiveStatus;
}
