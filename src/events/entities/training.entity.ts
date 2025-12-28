import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';

@Entity('trainings')
export class Training extends BaseEntity {
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column()
  location: string;

  @Column({ nullable: true })
  topic?: string;

  @ManyToOne(() => Group, (group) => group.trainings)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => Attendance, (attendance) => attendance.training)
  attendances: Attendance[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.training)
  evaluations: Evaluation[];
}
