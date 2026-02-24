import {
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PersonEntity } from '../../common/entities/person.entity';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Position } from '../enums/position.enum';
import { StrongFoot } from '../enums/strong-foot.enum';

@Entity('players')
export class Player extends PersonEntity {
  @Column({ type: 'enum', enum: Position, default: Position.CM })
  position: Position;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number;

  @Column({ type: 'enum', enum: StrongFoot, default: StrongFoot.RIGHT })
  strongFoot: StrongFoot;

  @OneToOne(() => User, (user) => user.player)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Parent, (parent) => parent.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Parent | null;

  @ManyToOne(() => Group, (group) => group.players, { nullable: true })
  group: Group | null;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.player)
  evaluations: Evaluation[];

  @OneToMany(() => Attendance, (attendance) => attendance.player)
  attendances: Attendance[];
}
