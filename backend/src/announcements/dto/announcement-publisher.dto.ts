import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Payload da rota de publicação de comunicados (Template Method, portado de
 * design-pattern-implementation/backend). O schema atual só suporta
 * `audience: 'all'` — os demais valores retornam 400.
 */
export const publishAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  audience: z.enum(['all', 'residents', 'providers', 'managers']),
  trackReads: z.boolean().optional(),
});

export class PublishAnnouncementDto extends createZodDto(publishAnnouncementSchema) {}
