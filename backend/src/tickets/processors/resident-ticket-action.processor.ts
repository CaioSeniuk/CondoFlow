import { Ticket, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { TicketActionTemplate } from './ticket-action.template';
import { TicketActionPayload, TicketActionResult } from './ticket-action.types';

/**
 * Etapa do residente: "abrir o chamado" já é responsabilidade de
 * `TicketsService.create`. Aqui ele só pode corrigir os dados enquanto o
 * chamado ainda não entrou em análise — uma vez que o síndico valida
 * (`under_review` em diante), a etapa do residente já passou e editar deixa
 * de fazer sentido.
 */
export class ResidentTicketActionProcessor extends TicketActionTemplate {
  protected loadTicketInScope(id: bigint, actor: AuthenticatedUser): Promise<Ticket | null> {
    return this.repo.findByIdForResident(id, actor.id);
  }

  protected performRoleSpecificAction(
    ticket: Ticket,
    _actor: AuthenticatedUser,
    payload: TicketActionPayload,
  ): TicketActionResult {
    if (ticket.status !== TicketStatus.open) {
      this.forbidden('Ticket can only be edited by the resident while still open');
    }

    return {
      data: {
        category: payload.category ?? ticket.category,
        location: payload.location ?? ticket.location,
        description: payload.description ?? ticket.description,
      },
    };
  }
}
