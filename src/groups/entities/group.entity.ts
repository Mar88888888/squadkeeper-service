import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { Player } from '../../players/entities/player.entity';
import { Training } from '../../events/entities/training.entity';
import { Match } from '../../events/entities/match.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'int' })
  yearOfBirth: number;

  @ManyToOne(() => Coach, (coach) => coach.groups)
  coach: Coach;

  @OneToMany(() => Player, (player) => player.group)
  players: Player[];

  @OneToMany(() => Training, (training) => training.group)
  trainings: Training[];

  @OneToMany(() => Match, (match) => match.group)
  matches: Match[];
}
