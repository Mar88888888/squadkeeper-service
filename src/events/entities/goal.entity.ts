import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Match } from './match.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('goals')
export class Goal extends BaseEntity {
  @ManyToOne(() => Match, (match) => match.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scorerId' })
  scorer: Player;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assistId' })
  assist: Player | null;

  @Column({ type: 'int', nullable: true })
  minute: number | null;

  @Column({ type: 'boolean', default: false })
  isOwnGoal: boolean;
}
