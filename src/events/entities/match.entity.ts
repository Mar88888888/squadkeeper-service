import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';
import { MatchType } from '../enums/match-type.enum';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('matches')
export class Match extends BaseEntity {
  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column()
  location: string;

  @Column()
  opponent: string;

  @Column({ type: 'boolean' })
  isHome: boolean;

  @Column({
    type: 'enum',
    enum: MatchType,
    default: MatchType.FRIENDLY,
  })
  matchType: MatchType;

  @Column({ type: 'int', nullable: true })
  homeGoals: number | null;

  @Column({ type: 'int', nullable: true })
  awayGoals: number | null;

  @ManyToOne(() => Group, (group) => group.matches)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => Attendance, (attendance) => attendance.match)
  attendances: Attendance[];
}
