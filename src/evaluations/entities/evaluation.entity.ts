import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Player } from '../../players/entities/player.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { Training } from '../../events/entities/training.entity';
import { Match } from '../../events/entities/match.entity';
import { EvaluationType } from '../enums/evaluation-type.enum';

@Entity('evaluations')
export class Evaluation extends BaseEntity {
  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: EvaluationType,
  })
  type: EvaluationType;

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
