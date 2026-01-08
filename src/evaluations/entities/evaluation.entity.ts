import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Player } from '../../players/entities/player.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { Training } from '../../events/entities/training.entity';
import { Match } from '../../events/entities/match.entity';

@Entity('evaluations')
@Unique(['player', 'training', 'match'])
export class Evaluation extends BaseEntity {
  @Column({ type: 'int', nullable: true })
  technical: number | null;

  @Column({ type: 'int', nullable: true })
  tactical: number | null;

  @Column({ type: 'int', nullable: true })
  physical: number | null;

  @Column({ type: 'int', nullable: true })
  psychological: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ManyToOne(() => Player, (player) => player.evaluations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @ManyToOne(() => Coach, (coach) => coach.evaluations)
  @JoinColumn({ name: 'coachId' })
  coach: Coach;

  @ManyToOne(() => Training, (training) => training.evaluations, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'trainingId' })
  training: Training | null;

  @ManyToOne(() => Match, (match) => match.evaluations, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'matchId' })
  match: Match | null;
}
