// Valores só para satisfazer a validação de env — os testes não conectam em nada real.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  SUPABASE_S3_ACCESS_KEY_ID: 'test',
  SUPABASE_S3_SECRET_ACCESS_KEY: 'test',
  SUPABASE_S3_BUCKET_NAME: 'test',
  SUPABASE_S3_ENDPOINT_URL: 'http://localhost/storage/v1/s3',
});
