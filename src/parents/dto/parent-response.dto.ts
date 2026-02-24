import { Expose, Type } from 'class-transformer';

class ParentUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;
}

class ParentChildDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;
}

export class ParentResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phoneNumber: string | null;

  @Expose()
  @Type(() => ParentUserDto)
  user: ParentUserDto;

  @Expose()
  @Type(() => ParentChildDto)
  children: ParentChildDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
