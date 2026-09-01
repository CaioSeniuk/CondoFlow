import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const tokenObtainSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export class TokenObtainDto extends createZodDto(tokenObtainSchema) {}

export const tokenRefreshSchema = z.object({
  refresh: z.string().min(1),
});

export class TokenRefreshDto extends createZodDto(tokenRefreshSchema) {}

export interface TokenPairResponse {
  access: string;
  refresh: string;
}
