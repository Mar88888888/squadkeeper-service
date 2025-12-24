import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Player } from '../../players/entities/player.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { EvaluationType } from '../enums/evaluation-type.enum';

@Entity('evaluations')
export class Evaluation extends BaseEntity {
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({
    type: 'enum',
    enum: EvaluationType,
  })
  type: EvaluationType;

  @ManyToOne(() => Player, (player) => player.evaluations)
  player: Player;

  @ManyToOne(() => Coach, (coach) => coach.evaluations)
  coach: Coach;
}
