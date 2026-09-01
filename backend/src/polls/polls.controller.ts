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
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { assertVisible } from '../common/access';
import { RolesGuard } from '../auth/roles.guard';
import { ManagerOrReadOnlyGuard } from '../auth/manager-or-read-only.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PollsService } from './polls.service';
import { CreatePollDto, UpdatePollDto, VoteDto } from './dto/poll.dto';

@ApiTags('polls')
@UseGuards(RolesGuard)
@Controller('api/v1/polls')
export class PollsController {
  constructor(private service: PollsService) {}

  @Get()
  @ApiOperation({
    summary: 'List polls',
    description: 'Visible to residents and managers. Doormen and providers see no results.',
  })
  async list(@Req() req: { user: AuthenticatedUser }) {
    const [polls, votedPollIds] = await Promise.all([
      this.service.listForUser(req.user),
      this.service.votedPollIds(req.user),
    ]);
    return polls.map((poll) => this.service.serialize(poll, votedPollIds));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a poll' })
  async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    const poll = assertVisible(await this.service.findByIdForUser(BigInt(id), req.user));
    return this.service.serialize(poll, await this.service.votedPollIds(req.user));
  }

  @Post()
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Create a poll', description: 'Manager only.' })
  async create(@Body() dto: CreatePollDto, @Req() req: { user: AuthenticatedUser }) {
    const poll = await this.service.create(dto, req.user);
    return this.service.serialize(poll, new Set());
  }

  @Patch(':id')
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Partially update a poll', description: 'Manager only.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePollDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const poll = await this.service.update(BigInt(id), dto, req.user);
    return this.service.serialize(poll, await this.service.votedPollIds(req.user));
  }

  @Delete(':id')
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Delete a poll', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }

  @Post(':id/vote')
  @Roles(UserRole.resident)
  @ApiOperation({
    summary: 'Vote on a poll',
    description: 'Resident only. Each resident may vote once per poll.',
  })
  async vote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoteDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const pollId = BigInt(id);
    await this.service.vote(pollId, BigInt(dto.option), req.user);
    const poll = assertVisible(await this.service.findByIdForUser(pollId, req.user));
    return this.service.serialize(poll, await this.service.votedPollIds(req.user));
  }
}
