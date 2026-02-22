import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { ValidatedUserDto } from '../users/dto/validated-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUserDto | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return plainToInstance(ValidatedUserDto, user, {
        excludeExtraneousValues: true,
      });
    }

    return null;
  }

  async login(user: ValidatedUserDto): Promise<{ access_token: string }> {
    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: [
        'coach',
        'coach.headGroups',
        'coach.assistantGroups',
        'player',
        'player.group',
        'parent',
        'parent.children',
        'parent.children.group',
      ],
    });

    const groupIds = this.extractGroupIds(fullUser);

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      groupIds,
      playerId: fullUser?.player?.id,
      coachId: fullUser?.coach?.id,
      children: fullUser?.parent?.children?.map((c) => ({
        id: c.id,
        groupId: c.group?.id,
      })),
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private extractGroupIds(user: User | null): string[] {
    if (!user) return [];

    const groupIds = new Set<string>();

    if (user.role === UserRole.COACH && user.coach) {
      user.coach.headGroups?.forEach((g) => groupIds.add(g.id));
      user.coach.assistantGroups?.forEach((g) => groupIds.add(g.id));
    }

    if (user.role === UserRole.PLAYER && user.player?.group) {
      groupIds.add(user.player.group.id);
    }

    if (user.role === UserRole.PARENT && user.parent?.children) {
      user.parent.children.forEach((child) => {
        if (child.group) groupIds.add(child.group.id);
      });
    }

    return Array.from(groupIds);
  }
}
