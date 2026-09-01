import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ManagerOrReadOnlyGuard } from '../auth/manager-or-read-only.guard';
import { assertVisible } from '../common/access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ExpenseCategoriesService, ExpensesService } from './finance.service';
import {
  CreateCategoryDto,
  CreateExpenseDto,
  UpdateCategoryDto,
  UpdateExpenseDto,
} from './dto/finance.dto';

@ApiTags('finance')
@UseGuards(ManagerOrReadOnlyGuard)
@Controller('api/v1/finance/categories')
export class ExpenseCategoriesController {
  constructor(private service: ExpenseCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List expense categories',
    description: 'Visible to residents and managers. Doormen and providers see no results.',
  })
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.service.listForUser(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an expense category' })
  async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return assertVisible(await this.service.findByIdForUser(BigInt(id), req.user));
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense category', description: 'Manager only.' })
  create(@Body() dto: CreateCategoryDto, @Req() req: { user: AuthenticatedUser }) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an expense category', description: 'Manager only.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense category', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}

@ApiTags('finance')
@UseGuards(ManagerOrReadOnlyGuard)
@Controller('api/v1/finance')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  @ApiOperation({
    summary: 'List expenses',
    description:
      'Visible to residents and managers. Each expense shows budgeted vs. actual amount for a reference month. Doormen and providers see no results.',
  })
  async list(@Req() req: { user: AuthenticatedUser }) {
    const expenses = await this.service.listForUser(req.user);
    return expenses.map((expense) => this.service.serialize(expense));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an expense' })
  async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.serialize(
      assertVisible(await this.service.findByIdForUser(BigInt(id), req.user)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Register an expense', description: 'Manager only.' })
  async create(@Body() dto: CreateExpenseDto, @Req() req: { user: AuthenticatedUser }) {
    return this.service.serialize(await this.service.create(dto, req.user));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an expense', description: 'Manager only.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.serialize(await this.service.update(BigInt(id), dto, req.user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}
