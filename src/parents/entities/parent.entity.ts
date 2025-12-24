import { Entity, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { PersonEntity } from '../../common/entities/person.entity';
import { User } from '../../users/entities/user.entity';
import { Player } from '../../players/entities/player.entity';

@Entity('parents')
export class Parent extends PersonEntity {
  @OneToOne(() => User, (user) => user.parent)
  @JoinColumn()
  user: User;

  @OneToMany(() => Player, (player) => player.parent)
  children: Player[];
}
