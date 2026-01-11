import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';
import { Position } from '../../players/enums/position.enum';

export interface PositionExpectation {
  expectedGoalsPerMatch: number;
  expectedAssistsPerMatch: number;
}

export type PositionExpectations = Record<Position, PositionExpectation>;

@Entity('performance_settings')
export class PerformanceSettings extends BaseEntity {
  @OneToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn()
  group: Group;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'int', default: 35 })
  skillWeight: number;

  @Column({ type: 'int', default: 35 })
  offenseWeight: number;

  @Column({ type: 'int', default: 15 })
  defenseWeight: number;

  @Column({ type: 'int', default: 15 })
  teamWeight: number;

  @Column({ type: 'jsonb', default: {} })
  positionExpectations: PositionExpectations;
}
