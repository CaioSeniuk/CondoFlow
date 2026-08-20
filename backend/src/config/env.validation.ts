import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória — o backend não sobe sem ela'),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SUPABASE_S3_ACCESS_KEY_ID: z.string().min(1),
  SUPABASE_S3_SECRET_ACCESS_KEY: z.string().min(1),
  SUPABASE_S3_BUCKET_NAME: z.string().min(1),
  SUPABASE_S3_ENDPOINT_URL: z.string().min(1),
  SUPABASE_S3_REGION: z.string().default('us-east-1'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${parsed.error.toString()}`);
  }
  return parsed.data;
}
