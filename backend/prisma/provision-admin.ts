import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error('Defina ADMIN_PASSWORD com pelo menos 16 caracteres.');
  }
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const condominiumId = BigInt(process.env.ADMIN_CONDOMINIUM_ID ?? '1');
  await prisma.condominium.findUniqueOrThrow({ where: { id: condominiumId } });
  if (await prisma.user.findUnique({ where: { username } })) {
    throw new Error('Usuário já existe. Não é permitido promover ou substituir contas existentes.');
  }
  await prisma.user.create({
    data: {
      username,
      password: await bcrypt.hash(password, 12),
      condominiumId,
      firstName: 'Administrador',
      lastName: 'CondoFlow',
      email: process.env.ADMIN_EMAIL ?? 'admin@condoflow.local',
      role: 'manager',
      isSuperuser: true,
      isStaff: true,
    },
  });
  console.log(`Administrador global ${username} provisionado.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Falha no provisionamento.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
