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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

@ApiTags('announcements')
@Controller('api/v1/announcements')
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  private serialize(announcement: any, user: AuthenticatedUser) {
    return { ...announcement, confirmedByMe: this.service.confirmedByMe(announcement, user) };
  }

  @Get()
  @ApiOperation({
    summary: 'List announcements',
    description:
      'Residents see only announcements targeted at their segment (all, their block, or their apartment). Managers see every announcement.',
  })
  async list(@Req() req: { user: AuthenticatedUser }) {
    const announcements = await this.service.listForUser(req.user);
    return announcements.map((a) => this.serialize(a, req.user));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve an announcement',
    description:
      'Residents can only retrieve announcements targeted at their segment; anything else responds 404.',
  })
  async retrieve(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    const announcement = assertVisible(await this.service.findByIdForUser(BigInt(id), req.user));
    return this.serialize(announcement, req.user);
  }

  @Post()
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Create an announcement', description: 'Manager only.' })
  async create(@Body() dto: CreateAnnouncementDto, @Req() req: { user: AuthenticatedUser }) {
    const announcement = await this.service.create(dto, req.user);
    return this.serialize(announcement, req.user);
  }

  @Patch(':id')
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Partially update an announcement', description: 'Manager only.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const announcement = await this.service.update(BigInt(id), dto, req.user);
    return this.serialize(announcement, req.user);
  }

  @Delete(':id')
  @UseGuards(ManagerOrReadOnlyGuard)
  @ApiOperation({ summary: 'Delete an announcement', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }

  @Post(':id/confirm_read')
  @ApiOperation({
    summary: 'Confirm the announcement was read',
    description: 'Registers that the authenticated resident read this announcement.',
  })
  async confirmRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    await this.service.confirmRead(BigInt(id), req.user);
    return { status: 'read confirmed' };
  }
}
