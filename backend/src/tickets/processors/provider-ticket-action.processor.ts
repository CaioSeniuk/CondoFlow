import { Ticket, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { StatusHistoryRepository, TicketsRepository } from '../tickets.repository';
import { StatusTransitionHandler } from '../status-transition.chain';
import { TicketActionTemplate } from './ticket-action.template';
import { TicketActionPayload, TicketActionResult } from './ticket-action.types';

const EXECUTABLE_STATUSES: TicketStatus[] = [TicketStatus.in_progress, TicketStatus.resolved];

/**
 * Etapa do prestador de serviço: executa o que foi solicitado no chamado.
 * `loadTicketInScope` já garante que ele só enxerga chamados atribuídos a
 * ele mesmo (mesmo filtro usado em `TicketsService.listForUser`); aqui a
 * regra extra é que ele só pode avançar para `in_progress`/`resolved` —
 * validar o chamado ou reatribuir prestador é etapa do síndico, não dele.
 */
export class ProviderTicketActionProcessor extends TicketActionTemplate {
  constructor(
    repo: TicketsRepository,
    statusHistoryRepo: StatusHistoryRepository,
    private readonly statusTransitionChain: StatusTransitionHandler,
  ) {
    super(repo, statusHistoryRepo);
  }

  protected loadTicketInScope(id: bigint, actor: AuthenticatedUser): Promise<Ticket | null> {
    return this.repo.findByIdForProviderUser(id, actor.id);
  }

  protected performRoleSpecificAction(
    ticket: Ticket,
    _actor: AuthenticatedUser,
    payload: TicketActionPayload,
  ): TicketActionResult {
    if (!payload.status || !EXECUTABLE_STATUSES.includes(payload.status)) {
      this.forbidden('Provider can only move a ticket to in_progress or resolved');
    }

    this.statusTransitionChain.handle({ ticket, nextStatus: payload.status });

    return {
      data: { status: payload.status },
      historyStatus: payload.status,
      historyNote: payload.note,
    };
  }
}
