import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenPairResponse } from './dto/token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private passwords: PasswordService,
    private config: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<TokenPairResponse> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      // Gasta o mesmo tempo do caminho feliz antes de responder: sem isto dá para
      // enumerar contas medindo o tempo de resposta.
      await this.passwords.runDummyVerify(password);
      throw new UnauthorizedException('No active account found with the given credentials');
    }

    const valid = await this.passwords.verify(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('No active account found with the given credentials');
    }

    if (this.passwords.isLegacyDjangoHash(user.password)) {
      const rehashed = await this.passwords.hash(password);
      await this.prisma.user.update({ where: { id: user.id }, data: { password: rehashed } });
    }

    return this.issueTokenPair(user.id.toString());
  }

  async refresh(refreshToken: string): Promise<TokenPairResponse> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: BigInt(payload.sub) } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    return this.issueTokenPair(payload.sub);
  }

  private async issueTokenPair(subject: string): Promise<TokenPairResponse> {
    const [access, refresh] = await Promise.all([
      this.jwt.signAsync(
        { sub: subject, type: 'access' },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwt.signAsync(
        { sub: subject, type: 'refresh' },
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);
    return { access, refresh };
  }
}
