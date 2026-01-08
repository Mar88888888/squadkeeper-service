import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Squad } from './squad.entity';
import { Player } from '../../players/entities/player.entity';
import { Position } from '../../players/enums/position.enum';

@Entity('squad_positions')
export class SquadPosition extends BaseEntity {
  @ManyToOne(() => Squad, (squad) => squad.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'squadId' })
  squad: Squad;

  @ManyToOne(() => Player, { nullable: true, eager: true })
  @JoinColumn({ name: 'playerId' })
  player: Player | null;

  @Column({ type: 'enum', enum: Position })
  role: Position;

  @Column({ type: 'boolean', default: true })
  isStarter: boolean;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;
}
