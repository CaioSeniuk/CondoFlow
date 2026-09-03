import { Ticket, TicketStatus, TicketUrgency } from '@prisma/client';
import { buildStatusTransitionChain } from './status-transition.chain';
import { InvalidStatusTransitionError } from './tickets.errors';

function ticket(status: TicketStatus, providerId: bigint | null = null): Ticket {
  return {
    id: 1n,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1n,
    updatedById: null,
    residentId: 1n,
    category: 'Plumbing',
    location: 'Bathroom',
    description: 'Leaking pipe',
    photo: null,
    urgency: TicketUrgency.low,
    status,
    providerId,
  };
}

describe('ticket status transition chain', () => {
  it('rejects setting the same status the ticket already has', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({ ticket: ticket(TicketStatus.open), nextStatus: TicketStatus.open }),
    ).toThrow(InvalidStatusTransitionError);
  });

  it('rejects changing a ticket that is already resolved', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({
        ticket: ticket(TicketStatus.resolved),
        nextStatus: TicketStatus.under_review,
      }),
    ).toThrow(InvalidStatusTransitionError);
  });

  it('rejects moving to in_progress without an assigned provider', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({
        ticket: ticket(TicketStatus.provider_assigned),
        nextStatus: TicketStatus.in_progress,
      }),
    ).toThrow(InvalidStatusTransitionError);
  });

  it('rejects moving to resolved without an assigned provider', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({ ticket: ticket(TicketStatus.in_progress), nextStatus: TicketStatus.resolved }),
    ).toThrow(InvalidStatusTransitionError);
  });

  it('allows a valid transition with a provider assigned', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({
        ticket: ticket(TicketStatus.provider_assigned, 5n),
        nextStatus: TicketStatus.in_progress,
      }),
    ).not.toThrow();
  });

  it('allows transitions that do not require a provider', () => {
    const chain = buildStatusTransitionChain();

    expect(() =>
      chain.handle({ ticket: ticket(TicketStatus.open), nextStatus: TicketStatus.under_review }),
    ).not.toThrow();
  });
});
