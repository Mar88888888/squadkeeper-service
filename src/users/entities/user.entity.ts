import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../enums/user-role.enum';
import { Player } from '../../players/entities/player.entity';
import { Coach } from '../../coaches/entities/coach.entity';
import { Parent } from '../../parents/entities/parent.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @OneToOne(() => Player, (player) => player.user, { nullable: true })
  @JoinColumn()
  player: Player;

  @OneToOne(() => Coach, (coach) => coach.user, { nullable: true })
  @JoinColumn()
  coach: Coach;

  @OneToOne(() => Parent, (parent) => parent.user, { nullable: true })
  @JoinColumn()
  parent: Parent;
}
