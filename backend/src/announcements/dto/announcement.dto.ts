import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AnnouncementSegment } from '@prisma/client';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  segment: z.nativeEnum(AnnouncementSegment).default(AnnouncementSegment.all),
  block: z.string().max(10).default(''),
  apartment: z.string().max(10).default(''),
  urgent: z.boolean().default(false),
});

export class CreateAnnouncementDto extends createZodDto(createAnnouncementSchema) {}

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export class UpdateAnnouncementDto extends createZodDto(updateAnnouncementSchema) {}
