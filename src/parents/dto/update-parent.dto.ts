import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateParentDto } from './create-parent.dto';

export class UpdateParentDto extends PartialType(
  OmitType(CreateParentDto, ['childrenIds'] as const),
) {}
