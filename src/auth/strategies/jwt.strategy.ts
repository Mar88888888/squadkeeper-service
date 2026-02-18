import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
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

    if (!user) {
      throw new UnauthorizedException();
    }

    const groupIds = this.extractGroupIds(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      groupIds,
    };
  }

  private extractGroupIds(user: User): string[] {
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
