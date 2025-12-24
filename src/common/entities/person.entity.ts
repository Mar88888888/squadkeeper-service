import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export abstract class PersonEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;
}
