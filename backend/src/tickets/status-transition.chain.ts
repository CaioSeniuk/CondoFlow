import { Ticket, TicketStatus } from '@prisma/client';
import { Handler } from '../common/handler';
import { InvalidStatusTransitionError } from './tickets.errors';

export interface StatusTransitionRequest {
  ticket: Ticket;
  nextStatus: TicketStatus;
}

const STATUSES_REQUIRING_PROVIDER: TicketStatus[] = [
  TicketStatus.in_progress,
  TicketStatus.resolved,
];

export abstract class StatusTransitionHandler extends Handler<StatusTransitionRequest, void> {}

export class NoNoOpTransitionHandler extends StatusTransitionHandler {
  handle(request: StatusTransitionRequest): void {
    if (request.ticket.status === request.nextStatus) {
      throw new InvalidStatusTransitionError('Ticket is already in this status');
    }
    return super.handle(request);
  }
}

export class NotAlreadyResolvedHandler extends StatusTransitionHandler {
  handle(request: StatusTransitionRequest): void {
    if (request.ticket.status === TicketStatus.resolved) {
      throw new InvalidStatusTransitionError('A resolved ticket cannot change status');
    }
    return super.handle(request);
  }
}

export class RequiresProviderHandler extends StatusTransitionHandler {
  handle(request: StatusTransitionRequest): void {
    const needsProvider = STATUSES_REQUIRING_PROVIDER.includes(request.nextStatus);
    if (needsProvider && !request.ticket.providerId) {
      throw new InvalidStatusTransitionError(
        'A provider must be assigned before moving to this status',
      );
    }
    return super.handle(request);
  }
}

export function buildStatusTransitionChain(): StatusTransitionHandler {
  const noNoOp = new NoNoOpTransitionHandler();
  const notResolved = new NotAlreadyResolvedHandler();
  const requiresProvider = new RequiresProviderHandler();
  noNoOp.setNext(notResolved).setNext(requiresProvider);
  return noNoOp;
}
