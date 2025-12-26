import { Entity, Column, ManyToOne, JoinColumn, Unique, Check } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Player } from '../../players/entities/player.entity';
import { Training } from '../../events/entities/training.entity';
import { Match } from '../../events/entities/match.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';

@Entity('attendances')
@Unique(['player', 'training'])
@Unique(['player', 'match'])
@Check(
  `("trainingId" IS NOT NULL AND "matchId" IS NULL) OR ("trainingId" IS NULL AND "matchId" IS NOT NULL)`,
)
export class Attendance extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Player, (player) => player.attendances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @ManyToOne(() => Training, (training) => training.attendances, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trainingId' })
  training: Training | null;

  @ManyToOne(() => Match, (match) => match.attendances, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'matchId' })
  match: Match | null;
}
