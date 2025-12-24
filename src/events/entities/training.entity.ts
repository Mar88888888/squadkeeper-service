import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('trainings')
export class Training extends BaseEntity {
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column()
  location: string;

  @Column()
  topic: string;

  @ManyToOne(() => Group, (group) => group.trainings)
  group: Group;
}
