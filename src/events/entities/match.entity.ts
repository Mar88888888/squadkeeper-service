import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';

@Entity('matches')
export class Match extends BaseEntity {
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column()
  opponentName: string;

  @Column({ type: 'boolean' })
  isHome: boolean;

  @Column({ type: 'int', default: 0 })
  goalsScored: number;

  @Column({ type: 'int', default: 0 })
  goalsConceded: number;

  @ManyToOne(() => Group, (group) => group.matches)
  group: Group;
}
