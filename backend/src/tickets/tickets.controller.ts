import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Ticket, UserRole } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { TicketsService } from './tickets.service';
import {
  AssignProviderDto,
  ChangeStatusDto,
  CreateTicketDto,
  TicketActionDto,
  UpdateTicketDto,
} from './dto/ticket.dto';
import { InvalidStatusTransitionError } from './tickets.errors';
import { ScopedResourceController } from '../common/scoped-resource.controller';

@ApiTags('tickets')
@UseGuards(RolesGuard)
@Controller('api/v1/tickets')
export class TicketsController extends ScopedResourceController<Ticket>({
  listSummary: 'List tickets',
  listDescription:
    'Residents see only their own tickets. Providers see only tickets assigned to them. Managers see every ticket.',
  retrieveSummary: 'Retrieve a ticket',
  retrieveDescription:
    'Residents can only retrieve their own tickets and providers only the ones assigned to them; anything else responds 404.',
}) {
  service: TicketsService;

  constructor(
    service: TicketsService,
    private storage: StorageService,
  ) {
    super();
    this.service = service;
  }

  @Post()
  @Roles(UserRole.resident)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({
    summary: 'Open a ticket',
    description: 'Resident only. Creates the initial status history entry.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string', example: 'Elétrica' },
        location: { type: 'string', example: 'Garagem - vaga 12' },
        description: { type: 'string', example: 'Lâmpada queimada próxima à vaga.' },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
        photo: { type: 'string', format: 'binary' },
      },
      required: ['category', 'location', 'description'],
    },
  })
  async create(
    @Body() dto: CreateTicketDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const photoUrl = photo ? await this.storage.upload('tickets', photo) : null;
    return this.service.create(dto, photoUrl, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.resident, UserRole.manager)
  @ApiOperation({
    summary: 'Partially update a ticket',
    description: 'Residents can only update their own tickets. Managers can update any ticket.',
  })
  @ApiBody({
    type: UpdateTicketDto,
    examples: {
      default: { summary: 'Exemplo de atualização', value: { urgency: 'high' } },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.update(BigInt(id), dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.resident, UserRole.manager)
  @ApiOperation({
    summary: 'Delete a ticket',
    description: 'Residents can only delete their own tickets. Managers can delete any ticket.',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: { user: AuthenticatedUser }) {
    return this.service.remove(BigInt(id), req.user);
  }

  @Post(':id/change_status')
  @Roles(UserRole.manager)
  @ApiOperation({
    summary: "Change a ticket's status",
    description: 'Manager only. Appends an entry to the ticket status history.',
  })
  @ApiBody({
    type: ChangeStatusDto,
    examples: {
      default: {
        summary: 'Exemplo de mudança de status',
        value: { status: 'in_progress', note: 'Equipe a caminho do local.' },
      },
    },
  })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    try {
      return await this.service.changeStatus(BigInt(id), dto.status, dto.note, req.user);
    } catch (err) {
      if (err instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Post(':id/assign_provider')
  @Roles(UserRole.manager)
  @ApiOperation({
    summary: 'Assign a provider to a ticket',
    description:
      "Manager only. Sets the ticket's status to 'provider_assigned' and appends an entry to the status history.",
  })
  @ApiBody({
    type: AssignProviderDto,
    examples: {
      default: { summary: 'Exemplo de atribuição', value: { provider: 3 } },
    },
  })
  assignProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignProviderDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.assignProvider(BigInt(id), dto.provider, req.user);
  }

  @Post(':id/actions')
  @Roles(UserRole.resident, UserRole.manager, UserRole.provider)
  @ApiOperation({
    summary: 'Act on a ticket',
    description:
      'Design pattern: Template Method. Entry point shared by resident, manager and provider. ' +
      'Every role runs the same load -> validate -> persist -> log skeleton; only the business ' +
      'rule for that stage (edit while open, validate/assign a provider, execute the service) ' +
      'changes, resolved by a role-specific processor (backend/src/tickets/processors).',
  })
  @ApiBody({
    type: TicketActionDto,
    examples: {
      resident: {
        summary: 'Exemplo (resident) — editar chamado aberto',
        value: { description: 'Lâmpada queimada, cheiro de queimado também.' },
      },
      manager: {
        summary: 'Exemplo (manager) — atribuir prestador',
        value: { providerId: 3, note: 'Encaminhado ao eletricista.' },
      },
      provider: {
        summary: 'Exemplo (provider) — avançar status',
        value: { status: 'in_progress', note: 'Chegando ao local.' },
      },
    },
  })
  async performAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TicketActionDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    try {
      return await this.service.performAction(BigInt(id), req.user, dto);
    } catch (err) {
      if (err instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
