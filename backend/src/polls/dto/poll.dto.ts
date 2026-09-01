import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPollSchema = z.object({
  question: z.string().min(1).max(200),
  closesAt: z.coerce.date().nullish(),
  options: z.array(z.object({ text: z.string().min(1).max(150) })).min(2),
});

export class CreatePollDto extends createZodDto(createPollSchema) {}

export const updatePollSchema = z.object({
  question: z.string().min(1).max(200).optional(),
  closesAt: z.coerce.date().nullish(),
});

export class UpdatePollDto extends createZodDto(updatePollSchema) {}

export const voteSchema = z.object({
  option: z.coerce.number().int(),
});

export class VoteDto extends createZodDto(voteSchema) {}
