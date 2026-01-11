import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceSettings, PositionExpectations } from './entities/performance-settings.entity';
import { Group } from '../groups/entities/group.entity';
import { Coach } from '../coaches/entities/coach.entity';
import {
  UpdatePerformanceSettingsDto,
  PerformanceSettingsResponse,
} from './dto/performance-settings.dto';
import {
  DEFAULT_WEIGHTS,
  DEFAULT_POSITION_EXPECTATIONS,
} from './constants/default-settings';

@Injectable()
export class PerformanceSettingsService {
  constructor(
    @InjectRepository(PerformanceSettings)
    private settingsRepository: Repository<PerformanceSettings>,
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(Coach)
    private coachesRepository: Repository<Coach>,
  ) {}

  async getSettings(groupId: string): Promise<PerformanceSettingsResponse> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const settings = await this.settingsRepository.findOne({
      where: { groupId },
    });

    if (settings) {
      const positionExpectations = this.mergePositionExpectations(
        settings.positionExpectations,
      );

      return {
        groupId: group.id,
        groupName: group.name,
        skillWeight: settings.skillWeight,
        offenseWeight: settings.offenseWeight,
        defenseWeight: settings.defenseWeight,
        teamWeight: settings.teamWeight,
        positionExpectations,
        isCustom: true,
      };
    }

    return {
      groupId: group.id,
      groupName: group.name,
      ...DEFAULT_WEIGHTS,
      positionExpectations: DEFAULT_POSITION_EXPECTATIONS,
      isCustom: false,
    };
  }

  async getSettingsForCalculation(groupId: string): Promise<{
    skillWeight: number;
    offenseWeight: number;
    defenseWeight: number;
    teamWeight: number;
    positionExpectations: PositionExpectations;
  }> {
    const settings = await this.settingsRepository.findOne({
      where: { groupId },
    });

    if (settings) {
      return {
        skillWeight: settings.skillWeight,
        offenseWeight: settings.offenseWeight,
        defenseWeight: settings.defenseWeight,
        teamWeight: settings.teamWeight,
        positionExpectations: this.mergePositionExpectations(
          settings.positionExpectations,
        ),
      };
    }

    return {
      ...DEFAULT_WEIGHTS,
      positionExpectations: DEFAULT_POSITION_EXPECTATIONS,
    };
  }

  async updateSettings(
    groupId: string,
    userId: string,
    dto: UpdatePerformanceSettingsDto,
  ): Promise<PerformanceSettingsResponse> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['headCoach', 'assistants'],
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    await this.validateCoachAccess(userId, group);

    const weights = {
      skillWeight: dto.skillWeight ?? DEFAULT_WEIGHTS.skillWeight,
      offenseWeight: dto.offenseWeight ?? DEFAULT_WEIGHTS.offenseWeight,
      defenseWeight: dto.defenseWeight ?? DEFAULT_WEIGHTS.defenseWeight,
      teamWeight: dto.teamWeight ?? DEFAULT_WEIGHTS.teamWeight,
    };

    const weightSum =
      weights.skillWeight +
      weights.offenseWeight +
      weights.defenseWeight +
      weights.teamWeight;

    if (weightSum !== 100) {
      throw new BadRequestException(
        `Weights must sum to 100. Current sum: ${weightSum}`,
      );
    }

    let settings = await this.settingsRepository.findOne({
      where: { groupId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        group,
        groupId,
        ...weights,
        positionExpectations: dto.positionExpectations ?? {},
      });
    } else {
      settings.skillWeight = weights.skillWeight;
      settings.offenseWeight = weights.offenseWeight;
      settings.defenseWeight = weights.defenseWeight;
      settings.teamWeight = weights.teamWeight;

      if (dto.positionExpectations) {
        settings.positionExpectations = {
          ...settings.positionExpectations,
          ...dto.positionExpectations,
        };
      }
    }

    await this.settingsRepository.save(settings);

    return this.getSettings(groupId);
  }

  async resetSettings(
    groupId: string,
    userId: string,
  ): Promise<PerformanceSettingsResponse> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['headCoach', 'assistants'],
    });

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    await this.validateCoachAccess(userId, group);

    const settings = await this.settingsRepository.findOne({
      where: { groupId },
    });

    if (settings) {
      await this.settingsRepository.remove(settings);
    }

    return this.getSettings(groupId);
  }

  async copySettings(
    targetGroupId: string,
    sourceGroupId: string,
    userId: string,
  ): Promise<PerformanceSettingsResponse> {
    const targetGroup = await this.groupsRepository.findOne({
      where: { id: targetGroupId },
      relations: ['headCoach', 'assistants'],
    });

    if (!targetGroup) {
      throw new NotFoundException(`Target group with id ${targetGroupId} not found`);
    }

    const sourceGroup = await this.groupsRepository.findOne({
      where: { id: sourceGroupId },
    });

    if (!sourceGroup) {
      throw new NotFoundException(`Source group with id ${sourceGroupId} not found`);
    }

    await this.validateCoachAccess(userId, targetGroup);

    const sourceSettings = await this.getSettings(sourceGroupId);

    let targetSettings = await this.settingsRepository.findOne({
      where: { groupId: targetGroupId },
    });

    if (!targetSettings) {
      targetSettings = this.settingsRepository.create({
        group: targetGroup,
        groupId: targetGroupId,
        skillWeight: sourceSettings.skillWeight,
        offenseWeight: sourceSettings.offenseWeight,
        defenseWeight: sourceSettings.defenseWeight,
        teamWeight: sourceSettings.teamWeight,
        positionExpectations: sourceSettings.positionExpectations,
      });
    } else {
      targetSettings.skillWeight = sourceSettings.skillWeight;
      targetSettings.offenseWeight = sourceSettings.offenseWeight;
      targetSettings.defenseWeight = sourceSettings.defenseWeight;
      targetSettings.teamWeight = sourceSettings.teamWeight;
      targetSettings.positionExpectations = sourceSettings.positionExpectations;
    }

    await this.settingsRepository.save(targetSettings);

    return this.getSettings(targetGroupId);
  }

  async getCoachGroups(userId: string): Promise<{ id: string; name: string }[]> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['headGroups', 'assistantGroups'],
    });

    if (!coach) {
      return [];
    }

    const groups = [...coach.headGroups, ...coach.assistantGroups];
    return groups.map((g) => ({ id: g.id, name: g.name }));
  }

  private async validateCoachAccess(
    userId: string,
    group: Group,
  ): Promise<void> {
    const coach = await this.coachesRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!coach) {
      throw new NotFoundException('Coach profile not found');
    }

    const isHeadCoach = group.headCoach?.id === coach.id;
    const isAssistant = group.assistants?.some((a) => a.id === coach.id);

    if (!isHeadCoach && !isAssistant) {
      throw new BadRequestException(
        'You do not have permission to modify settings for this group',
      );
    }
  }

  private mergePositionExpectations(
    customExpectations: Partial<PositionExpectations>,
  ): PositionExpectations {
    const result = { ...DEFAULT_POSITION_EXPECTATIONS };

    for (const [position, expectations] of Object.entries(
      customExpectations || {},
    )) {
      if (result[position as keyof PositionExpectations]) {
        result[position as keyof PositionExpectations] = {
          ...result[position as keyof PositionExpectations],
          ...expectations,
        };
      }
    }

    return result;
  }
}
