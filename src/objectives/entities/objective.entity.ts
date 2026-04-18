import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Player } from '../../players/entities/player.entity';
import { Group } from '../../groups/entities/group.entity';
import { ObjectiveMetric } from '../enums/objective-metric.enum';
import { ObjectiveScope } from '../enums/objective-scope.enum';
import { ObjectiveStatus } from '../enums/objective-status.enum';

@Entity('objectives')
export class Objective extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ObjectiveScope,
    default: ObjectiveScope.PLAYER,
  })
  scope: ObjectiveScope;

  @Column({ type: 'enum', enum: ObjectiveMetric })
  metric: ObjectiveMetric;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  targetValue: number;

  @Column({ type: 'timestamptz' })
  periodStart: Date;

  @Column({ type: 'timestamptz' })
  periodEnd: Date;

  @Column({ type: 'varchar', length: 80, nullable: true })
  badgeLabel: string | null;

  @Column({
    type: 'enum',
    enum: ObjectiveStatus,
    default: ObjectiveStatus.ACTIVE,
  })
  status: ObjectiveStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercent: number;

  @Column({ type: 'timestamptz', nullable: true })
  achievedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: Player | null;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group | null;
}
