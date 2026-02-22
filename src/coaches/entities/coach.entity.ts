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
import { LicenseLevel } from '../dto/create-coach.dto';

@Entity('coaches')
export class Coach extends PersonEntity {
  @Column({ type: 'varchar' })
  licenseLevel: LicenseLevel;

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
