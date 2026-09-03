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
import { Reservation, UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ManagerOrReadOnlyGuard } from '../auth/manager-or-read-only.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CommonAreasService, ReservationsService } from './reservations.service';
import {
  CreateCommonAreaDto,
  CreateReservationDto,
  UpdateCommonAreaDto,
  UpdateReservationDto,
} from './dto/reservation.dto';
import { ScopedResourceController } from '../common/scoped-resource.controller';

@ApiTags('reservations')
@UseGuards(ManagerOrReadOnlyGuard)
@Controller('api/v1/reservations/common-areas')
export class CommonAreasController {
  constructor(private service: CommonAreasService) {}

  @Get()
  @ApiOperation({ summary: 'List common areas', description: 'Visible to any authenticated user.' })
  list() {
    return this.service.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a common area' })
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    const commonArea = await this.service.findById(BigInt(id));
    if (!commonArea) throw new NotFoundException();
    return commonArea;
  }

  @Post()
  @ApiOperation({ summary: 'Create a common area', description: 'Manager only.' })
  create(@Body() dto: CreateCommonAreaDto, @Req() req: { user: AuthenticatedUser }) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a common area', description: 'Manager only.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommonAreaDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a common area', description: 'Manager only.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(BigInt(id));
  }
}

@ApiTags('reservations')
@UseGuards(RolesGuard)
@Controller('api/v1/reservations')
export class ReservationsController extends ScopedResourceController<Reservation>({
  listSummary: 'List reservations',
  listDescription: 'Residents see only their own reservations. Managers see every reservation.',
  retrieveSummary: 'Retrieve a reservation',
  retrieveDescription:
    'Residents can only retrieve their own reservations; anything else responds 404.',
}) {
  service: ReservationsService;

  constructor(service: ReservationsService) {
    super();
    this.service = service;
  }

  @Post()
  @Roles(UserRole.resident)
  @ApiOperation({
    summary: 'Create a reservation',
    description:
      'Resident only. The backend rejects any reservation that overlaps an existing confirmed reservation for the same common area.',
  })
  create(@Body() dto: CreateReservationDto, @Req() req: { user: AuthenticatedUser }) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.resident, UserRole.manager)
  @ApiOperation({
    summary: 'Partially update a reservation',
    description:
      'Residents can only update their own reservations. Overlap validation runs again on every update.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.resident, UserRole.manager)
  @ApiOperation({
    summary: 'Delete a reservation',
    description: 'Residents can only delete their own reservations.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.remove(BigInt(id), req.user);
  }
}
