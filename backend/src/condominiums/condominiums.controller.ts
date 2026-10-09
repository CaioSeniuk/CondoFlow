import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CondominiumsService } from './condominiums.service';

@ApiTags('condominiums')
@UseGuards(RolesGuard)
@Controller('api/v1/condominiums')
export class CondominiumsController {
  constructor(private service: CondominiumsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Retrieve your condominium without exposing the registration code' })
  me() {
    return this.service.me();
  }

  @Post('me/registration-code')
  @Roles(UserRole.manager)
  @ApiOperation({
    summary: 'Generate a registration code, invalidating the previous one. Manager only.',
  })
  replaceCode() {
    return this.service.replaceCode();
  }

  @Delete('me/registration-code')
  @Roles(UserRole.manager)
  @ApiOperation({
    summary: 'Revoke registration code and block new public registrations. Manager only.',
  })
  revokeCode() {
    return this.service.revokeCode();
  }
}
