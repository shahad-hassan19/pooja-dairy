import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) throw new UnauthorizedException();

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const payload = {
      sub: user.id,
      role: user.role,
      shopId: user.shopId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET,
    });

    const refreshTokenRaw = randomUUID();

    const refreshTokenHashed = await bcrypt.hash(refreshTokenRaw, 12);

    await this.usersService.updateRefreshToken(user.id, refreshTokenHashed);

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) throw new UnauthorizedException();

    const payload = {
      sub: user.id,
      role: user.role,
      shopId: user.shopId,
    };

    const newAccessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_SECRET,
    });

    return { accessToken: newAccessToken };
  }
}
