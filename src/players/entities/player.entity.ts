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

@Entity('players')
export class Player extends PersonEntity {
  @Column()
  position: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number;

  @Column()
  strongFoot: string;

  @OneToOne(() => User, (user) => user.player)
  @JoinColumn()
  user: User;

  @ManyToOne(() => Parent, (parent) => parent.children)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @ManyToOne(() => Group, (group) => group.players)
  group: Group;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.player)
  evaluations: Evaluation[];
}
