import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { ManagerOrReadOnlyGuard } from './manager-or-read-only.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordService, RolesGuard, ManagerOrReadOnlyGuard],
  exports: [AuthService, PasswordService, RolesGuard, ManagerOrReadOnlyGuard],
})
export class AuthModule {}
