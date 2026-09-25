import { Ticket, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { StatusHistoryRepository, TicketsRepository } from '../tickets.repository';
import { StatusTransitionHandler } from '../status-transition.chain';
import { TicketActionTemplate } from './ticket-action.template';
import { TicketActionPayload, TicketActionResult } from './ticket-action.types';

/**
 * Etapa do síndico (manager): valida o chamado (`open` → `under_review`) e/ou
 * atribui um prestador de serviço. Reaproveita a mesma Chain of
 * Responsibility que já protege `TicketsService.changeStatus`, para que a
 * regra de negócio fique idêntica na rota antiga e na nova rota genérica de
 * ação.
 */
export class ManagerTicketActionProcessor extends TicketActionTemplate {
  constructor(
    repo: TicketsRepository,
    statusHistoryRepo: StatusHistoryRepository,
    private readonly statusTransitionChain: StatusTransitionHandler,
  ) {
    super(repo, statusHistoryRepo);
  }

  protected performRoleSpecificAction(
    ticket: Ticket,
    _actor: AuthenticatedUser,
    payload: TicketActionPayload,
  ): TicketActionResult {
    if (payload.providerId) {
      return {
        data: {
          providerId: BigInt(payload.providerId),
          status: TicketStatus.provider_assigned,
        },
        historyStatus: TicketStatus.provider_assigned,
        historyNote: payload.note ?? 'Provider assigned',
      };
    }

    const nextStatus = payload.status ?? TicketStatus.under_review;
    this.statusTransitionChain.handle({ ticket, nextStatus });

    return {
      data: { status: nextStatus },
      historyStatus: nextStatus,
      historyNote: payload.note,
    };
  }
}
