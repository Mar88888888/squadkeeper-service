import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Group } from '../../groups/entities/group.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { SquadPosition } from './squad-position.entity';
import { GameFormat } from './game-format.enum';

@Entity('squads')
export class Squad extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: GameFormat })
  gameFormat: GameFormat;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Coach, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: Coach | null;

  @OneToMany(() => SquadPosition, (position) => position.squad, {
    cascade: true,
    eager: true,
  })
  positions: SquadPosition[];
}
