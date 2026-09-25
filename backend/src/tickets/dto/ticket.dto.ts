import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TicketStatus, TicketUrgency } from '@prisma/client';

export const createTicketSchema = z.object({
  category: z.string().min(1).max(100),
  location: z.string().min(1).max(150),
  description: z.string().min(1),
  urgency: z.nativeEnum(TicketUrgency).default(TicketUrgency.low),
});

export class CreateTicketDto extends createZodDto(createTicketSchema) {}

export const updateTicketSchema = createTicketSchema.partial();

export class UpdateTicketDto extends createZodDto(updateTicketSchema) {}

export const changeStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
  note: z.string().max(250).default(''),
});

export class ChangeStatusDto extends createZodDto(changeStatusSchema) {}

export const assignProviderSchema = z.object({
  provider: z.coerce.number().int(),
});

export class AssignProviderDto extends createZodDto(assignProviderSchema) {}

/**
 * Payload da rota genérica `POST /:id/actions` (Template Method). Todos os
 * campos são opcionais porque cada perfil usa apenas o subconjunto relevante
 * à sua etapa: resident (category/location/description), manager
 * (providerId ou status) e provider (status).
 */
export const ticketActionSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  note: z.string().max(250).optional(),
  providerId: z.coerce.number().int().optional(),
  category: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(150).optional(),
  description: z.string().min(1).optional(),
});

export class TicketActionDto extends createZodDto(ticketActionSchema) {}
