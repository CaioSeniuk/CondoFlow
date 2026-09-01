import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCommonAreaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default(''),
});

export class CreateCommonAreaDto extends createZodDto(createCommonAreaSchema) {}

export const updateCommonAreaSchema = createCommonAreaSchema.partial();

export class UpdateCommonAreaDto extends createZodDto(updateCommonAreaSchema) {}

export const createReservationSchema = z.object({
  commonArea: z.coerce.number().int(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export class CreateReservationDto extends createZodDto(createReservationSchema) {}

export const updateReservationSchema = createReservationSchema.partial();

export class UpdateReservationDto extends createZodDto(updateReservationSchema) {}
