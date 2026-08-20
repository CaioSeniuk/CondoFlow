import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { RegisterDto, UpdateUserDto } from './dto/user.dto';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

function excludePassword<T extends { password: string }>(user: T) {
  const { password, ...rest } = user;
  return rest;
}

@ApiTags('users')
@UseGuards(RolesGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'List users', description: 'Manager only.' })
  async list() {
    const users = await this.usersService.listAll();
    return users.map(excludePassword);
  }

  @Get('me')
  @ApiOperation({ summary: "Retrieve the authenticated user's profile" })
  me(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.findById(req.user.id).then((u) => u && excludePassword(u));
  }

  @Get(':id')
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'Retrieve a user', description: 'Manager only.' })
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(BigInt(id));
    if (!user) throw new NotFoundException();
    return excludePassword(user);
  }

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Register a user',
    description: 'Public endpoint. Creates the account with the given role and hashed password.',
  })
  async create(@Body() dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    return excludePassword(user);
  }

  @Patch(':id')
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'Partially update a user', description: 'Manager only.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(BigInt(id), dto);
    return excludePassword(user);
  }

  @Delete(':id')
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'Delete a user', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(BigInt(id));
  }
}
