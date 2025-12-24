// Test file to verify entity imports
import 'reflect-metadata';
import { User } from './src/users/entities/user.entity';
import { Coach } from './src/coaches/entities/coach.entity';
import { Player } from './src/players/entities/player.entity';
import { Parent } from './src/parents/entities/parent.entity';
import { Group } from './src/groups/entities/group.entity';
import { Training } from './src/events/entities/training.entity';
import { Match } from './src/events/entities/match.entity';
import { Evaluation } from './src/evaluations/entities/evaluation.entity';
import { BaseEntity } from './src/common/entities/base.entity';
import { PersonEntity } from './src/common/entities/person.entity';
import { UserRole } from './src/users/enums/user-role.enum';
import { EventType } from './src/events/enums/event-type.enum';
import { EvaluationType } from './src/evaluations/enums/evaluation-type.enum';

console.log('All imports successful!');
console.log('BaseEntity:', BaseEntity.name);
console.log('PersonEntity (abstract):', PersonEntity.name);
console.log('UserRole enum values:', Object.values(UserRole));
console.log('EventType enum values:', Object.values(EventType));
console.log('EvaluationType enum values:', Object.values(EvaluationType));
