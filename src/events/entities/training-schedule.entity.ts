import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('training_schedules')
export class TrainingSchedule extends BaseEntity {
  @Column({ type: 'int' })
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)

  @Column({ type: 'time' })
  startTime: string; // "HH:mm"

  @Column({ type: 'time' })
  endTime: string; // "HH:mm"

  @Column()
  location: string;

  @ManyToOne(() => Group, (group) => group.trainingSchedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
