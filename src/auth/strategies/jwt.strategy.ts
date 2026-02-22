import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  groupIds: string[];
  playerId?: string;
  coachId?: string;
  children?: { id: string; groupId?: string }[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
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

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      groupIds: payload.groupIds ?? [],
      playerId: payload.playerId,
      coachId: payload.coachId,
      children: payload.children,
    };
  }
}
