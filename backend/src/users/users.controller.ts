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
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateManagedUserDto, RegisterDto, UpdateUserDto } from './dto/user.dto';
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
    description: 'Public endpoint. Requires an active condominium code. Cannot create managers.',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: 'Exemplo de cadastro',
        value: {
          username: 'joao.silva',
          password: 'SenhaForte123',
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao.silva@example.com',
          role: 'resident',
          condominiumCode: '0123456789ABCDEF0123456789ABCDEF',
          block: 'A',
          apartment: '101',
          phone: '(41) 99999-0000',
        },
      },
    },
  })
  async create(@Body() dto: RegisterDto) {
    const user = await this.usersService.register(dto);
    return excludePassword(user);
  }

  @Post('managed')
  @Roles(UserRole.manager)
  @ApiOperation({
    summary: 'Create a user in your condominium. Manager only; no public code required.',
  })
  @ApiBody({ type: CreateManagedUserDto })
  async createManaged(@Body() dto: CreateManagedUserDto) {
    return excludePassword(await this.usersService.createManaged(dto));
  }

  @Patch(':id')
  @Roles(UserRole.manager)
  @ApiOperation({ summary: 'Partially update a user', description: 'Manager only.' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      default: { summary: 'Exemplo de atualização', value: { phone: '(41) 98888-1111' } },
    },
  })
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
