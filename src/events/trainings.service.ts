import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from './entities/training.entity';
import { Group } from '../groups/entities/group.entity';
import { CreateTrainingDto } from './dto/create-training.dto';

@Injectable()
export class TrainingsService {
  constructor(
    @InjectRepository(Training)
    private trainingsRepository: Repository<Training>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
  ) {}

  async create(createTrainingDto: CreateTrainingDto): Promise<Training> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: createTrainingDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with id ${createTrainingDto.groupId} not found`,
      );
    }

    // Validate endTime > startTime
    if (createTrainingDto.endTime <= createTrainingDto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const training = this.trainingsRepository.create({
      ...createTrainingDto,
      group,
    });

    return await this.trainingsRepository.save(training);
  }

  async findAll(): Promise<Training[]> {
    return await this.trainingsRepository.find({
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }

  async findByGroup(groupId: string): Promise<Training[]> {
    // Check if group exists
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return await this.trainingsRepository.find({
      where: { group: { id: groupId } },
      relations: ['group'],
      order: { startTime: 'ASC' },
    });
  }
}
