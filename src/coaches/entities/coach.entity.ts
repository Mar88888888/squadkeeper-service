import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { PersonEntity } from '../../common/entities/person.entity';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';

@Entity('coaches')
export class Coach extends PersonEntity {
  @Column()
  licenseLevel: string;

  @Column({ type: 'int' })
  experienceYears: number;

  @OneToOne(() => User, (user) => user.coach)
  @JoinColumn()
  user: User;

  @OneToMany(() => Group, (group) => group.headCoach)
  headGroups: Group[];

  @ManyToMany(() => Group, (group) => group.assistants)
  assistantGroups: Group[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.coach)
  evaluations: Evaluation[];
}
