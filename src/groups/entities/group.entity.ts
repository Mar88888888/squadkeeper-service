import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { Player } from '../../players/entities/player.entity';
import { Training } from '../../events/entities/training.entity';
import { Match } from '../../events/entities/match.entity';
import { TrainingSchedule } from '../../events/entities/training-schedule.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'int' })
  yearOfBirth: number;

  @ManyToOne(() => Coach, (coach) => coach.headGroups, { nullable: true })
  headCoach: Coach | null;

  @ManyToMany(() => Coach, (coach) => coach.assistantGroups)
  @JoinTable({ name: 'group_assistants' })
  assistants: Coach[];

  @OneToMany(() => Player, (player) => player.group)
  players: Player[];

  @OneToMany(() => Training, (training) => training.group)
  trainings: Training[];

  @OneToMany(() => Match, (match) => match.group)
  matches: Match[];

  @OneToMany(() => TrainingSchedule, (schedule) => schedule.group)
  trainingSchedules: TrainingSchedule[];
}
