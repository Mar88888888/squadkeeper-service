import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { Group } from '../groups/entities/group.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: createMatchDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createMatchDto.groupId} not found`,
      );
    }

    // Validate endTime > startTime
    if (createMatchDto.endTime <= createMatchDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const match = this.matchesRepository.create({
      ...createMatchDto,
      group,
      homeGoals: null,
      awayGoals: null,
    });

    return await this.matchesRepository.save(match);
  }

  async updateResult(
    id: string,
    updateMatchResultDto: UpdateMatchResultDto,
  ): Promise<Match> {
    const match = await this.matchesRepository.findOne({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} not found`);
    }

    match.homeGoals = updateMatchResultDto.homeGoals;
    match.awayGoals = updateMatchResultDto.awayGoals;

    return await this.matchesRepository.save(match);
  }

  async findAll(): Promise<Match[]> {
    return await this.matchesRepository.find({
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findByGroup(groupId: string): Promise<Match[]> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return await this.matchesRepository.find({
      where: { group: { id: groupId } },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }
}
