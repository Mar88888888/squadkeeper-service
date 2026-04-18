import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ObjectivesService } from './objectives.service';
import { Objective } from './entities/objective.entity';
import { Player } from '../players/entities/player.entity';
import { Group } from '../groups/entities/group.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Goal } from '../events/entities/goal.entity';
import { Match } from '../events/entities/match.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { ObjectiveMetric } from './enums/objective-metric.enum';

function createRepositoryMock() {
  return {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('ObjectivesService', () => {
  let service: ObjectivesService;
  const objectiveRepo = createRepositoryMock();
  const playerRepo = createRepositoryMock();
  const groupRepo = createRepositoryMock();
  const attendanceRepo = createRepositoryMock();
  const goalsRepo = createRepositoryMock();
  const matchesRepo = createRepositoryMock();
  const evaluationsRepo = createRepositoryMock();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectivesService,
        { provide: getRepositoryToken(Objective), useValue: objectiveRepo },
        { provide: getRepositoryToken(Player), useValue: playerRepo },
        { provide: getRepositoryToken(Group), useValue: groupRepo },
        { provide: getRepositoryToken(Attendance), useValue: attendanceRepo },
        { provide: getRepositoryToken(Goal), useValue: goalsRepo },
        { provide: getRepositoryToken(Match), useValue: matchesRepo },
        { provide: getRepositoryToken(Evaluation), useValue: evaluationsRepo },
      ],
    }).compile();

    service = module.get<ObjectivesService>(ObjectivesService);
  });

  it('rejects objective creation when period is invalid', async () => {
    await expect(
      service.create(
        {
          playerId: '11111111-1111-1111-1111-111111111111',
          title: 'Invalid',
          metric: ObjectiveMetric.GOALS,
          targetValue: 1,
          periodStart: '2026-05-02T00:00:00.000Z',
          periodEnd: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'user-1',
          email: 'coach@example.com',
          role: UserRole.COACH,
          firstName: 'Coach',
          lastName: 'One',
          groupIds: ['group-1'],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds summary from visible objectives', async () => {
    jest.spyOn(service, 'findMy').mockResolvedValue([
      {
        id: '1',
        title: 'Obj 1',
        status: 'active',
      } as Objective,
      {
        id: '2',
        title: 'Obj 2',
        status: 'achieved',
        achievedAt: new Date('2026-04-18T10:00:00.000Z'),
        badgeLabel: 'Finisher',
      } as Objective,
      {
        id: '3',
        title: 'Obj 3',
        status: 'expired',
      } as Objective,
    ]);

    const result = await service.getSummaryForMy({
      id: 'user-2',
      email: 'player@example.com',
      role: UserRole.PLAYER,
      firstName: 'Player',
      lastName: 'One',
      groupIds: ['group-1'],
      playerId: 'player-1',
    });

    expect(result.activeCount).toBe(1);
    expect(result.achievedCount).toBe(1);
    expect(result.expiredCount).toBe(1);
    expect(result.recentAchievements).toHaveLength(1);
  });
});
