import { ForbiddenException, Injectable } from '@nestjs/common';
import { TicketStatus, UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { assertVisible } from '../common/access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { StatusHistoryRepository, TicketsRepository } from './tickets.repository';
import { CreateTicketDto } from './dto/ticket.dto';
import { buildStatusTransitionChain } from './status-transition.chain';
import {
  ManagerTicketActionProcessor,
  ProviderTicketActionProcessor,
  ResidentTicketActionProcessor,
  TicketActionPayload,
  TicketActionTemplate,
} from './processors';

@Injectable()
export class TicketsService {
  private readonly statusTransitionChain = buildStatusTransitionChain();

  /**
   * Um processor (Template Method) por perfil que pode atuar sobre um
   * chamado já existente. `doorman` não participa do fluxo de chamados.
   */
  private readonly actionProcessors: Partial<Record<UserRole, TicketActionTemplate>>;

  constructor(
    private repo: TicketsRepository,
    private statusHistoryRepo: StatusHistoryRepository,
  ) {
    this.actionProcessors = {
      [UserRole.resident]: new ResidentTicketActionProcessor(repo, statusHistoryRepo),
      [UserRole.manager]: new ManagerTicketActionProcessor(
        repo,
        statusHistoryRepo,
        this.statusTransitionChain,
      ),
      [UserRole.provider]: new ProviderTicketActionProcessor(
        repo,
        statusHistoryRepo,
        this.statusTransitionChain,
      ),
    };
  }

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.resident) return this.repo.filterByResident(user.id);
    if (user.role === UserRole.provider) return this.repo.filterByProviderUser(user.id);
    if (user.role === UserRole.manager) return this.repo.all();
    return Promise.resolve([]);
  }

  findById(id: bigint) {
    return this.repo.findById(id);
  }

  /**
   * Mesmo escopo do `listForUser`: morador só acessa o próprio chamado, prestador
   * só os chamados atribuídos a ele.
   */
  async findByIdForUser(id: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.manager) return this.repo.findById(id);
    if (user.role === UserRole.resident) return this.repo.findByIdForResident(id, user.id);
    if (user.role === UserRole.provider) return this.repo.findByIdForProviderUser(id, user.id);
    return null;
  }

  async create(dto: CreateTicketDto, photoUrl: string | null, resident: AuthenticatedUser) {
    const ticket = await this.repo.create({
      ...dto,
      photo: photoUrl,
      residentId: resident.id,
      ...auditOnCreate(resident),
    });
    await this.statusHistoryRepo.create(ticket.id, ticket.status, resident.id);
    return this.repo.findById(ticket.id);
  }

  async update(id: bigint, dto: Partial<CreateTicketDto>, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.remove(id);
  }

  async changeStatus(id: bigint, status: TicketStatus, note: string, actor: AuthenticatedUser) {
    const ticket = assertVisible(await this.repo.findById(id));
    this.statusTransitionChain.handle({ ticket, nextStatus: status });

    await this.repo.update(id, { status, ...auditOnUpdate(actor) });
    await this.statusHistoryRepo.create(id, status, actor.id, note);
    return this.repo.findById(id);
  }

  async assignProvider(id: bigint, providerId: number, actor: AuthenticatedUser) {
    await this.repo.update(id, {
      providerId: BigInt(providerId),
      status: TicketStatus.provider_assigned,
      ...auditOnUpdate(actor),
    });
    await this.statusHistoryRepo.create(
      id,
      TicketStatus.provider_assigned,
      actor.id,
      'Provider assigned',
    );
    return this.repo.findById(id);
  }

  /**
   * Rota genérica de ação sobre um chamado (Template Method): o esqueleto —
   * carregar no escopo do perfil, delegar a regra de negócio específica,
   * persistir e logar histórico — é o mesmo para resident/manager/provider;
   * só a regra de cada etapa (editar enquanto aberto, validar/atribuir,
   * executar) muda, isolada em cada `TicketActionTemplate` concreto.
   */
  performAction(id: bigint, actor: AuthenticatedUser, payload: TicketActionPayload) {
    const processor = this.actionProcessors[actor.role];
    if (!processor) {
      throw new ForbiddenException('This role cannot act on tickets');
    }
    return processor.executeAction(id, actor, payload);
  }
}
