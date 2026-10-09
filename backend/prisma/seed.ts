import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const SEED_PASSWORD = process.env.SEED_PASSWORD;

async function main() {
  if (!SEED_PASSWORD) {
    throw new Error(
      'Defina a variável de ambiente SEED_PASSWORD antes de rodar o seed (ex.: SEED_PASSWORD=suaSenha npm run prisma:seed).',
    );
  }

  const password = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  const condominiumId = BigInt(process.env.SEED_CONDOMINIUM_ID ?? '1');
  const prefix = process.env.SEED_USER_PREFIX ?? '';
  const condominium = await prisma.condominium.upsert({
    where: { id: condominiumId },
    update: {},
    create: {
      id: condominiumId,
      name: process.env.SEED_CONDOMINIUM_NAME ?? 'Condomínio CondoFlow',
    },
  });
  for (const name of ['sindico', 'morador', 'porteiro', 'prestador']) {
    const existing = await prisma.user.findUnique({ where: { username: `${prefix}${name}` } });
    if (existing && existing.condominiumId !== condominium.id) {
      throw new Error(
        `O usuário ${prefix}${name} pertence a outro condomínio. Use SEED_USER_PREFIX distinto.`,
      );
    }
  }

  const sindico = await prisma.user.upsert({
    where: { username: `${prefix}sindico` },
    update: {},
    create: {
      username: `${prefix}sindico`,
      condominiumId,
      password,
      firstName: 'Helena',
      lastName: 'Síndica',
      email: 'sindico@condoflow.dev',
      role: UserRole.manager,
      isStaff: true,
      block: '',
      apartment: '',
    },
  });

  await prisma.user.upsert({
    where: { username: `${prefix}morador` },
    update: {},
    create: {
      username: `${prefix}morador`,
      condominiumId,
      password,
      firstName: 'Lucas',
      lastName: 'Morador',
      email: 'morador@condoflow.dev',
      role: UserRole.resident,
      block: 'A',
      apartment: '101',
    },
  });

  await prisma.user.upsert({
    where: { username: `${prefix}porteiro` },
    update: {},
    create: {
      username: `${prefix}porteiro`,
      condominiumId,
      password,
      firstName: 'Ricardo',
      lastName: 'Porteiro',
      email: 'porteiro@condoflow.dev',
      role: UserRole.doorman,
      isStaff: true,
      block: '',
      apartment: '',
    },
  });

  const prestadorUser = await prisma.user.upsert({
    where: { username: `${prefix}prestador` },
    update: {},
    create: {
      username: `${prefix}prestador`,
      condominiumId,
      password,
      firstName: 'Marcos',
      lastName: 'Prestador',
      email: 'prestador@condoflow.dev',
      role: UserRole.provider,
      block: '',
      apartment: '',
    },
  });

  await prisma.provider.upsert({
    where: { userId: prestadorUser.id },
    update: {},
    create: {
      name: 'Marcos Manutenção Predial',
      condominiumId,
      contractNumber: 'CT-0001',
      contact: '(41) 99999-0000',
      userId: prestadorUser.id,
      createdById: sindico.id,
    },
  });

  console.log('Seed concluída. Usuários criados (senha para todos: valor de SEED_PASSWORD):');
  console.log(`  ${prefix}sindico / ${prefix}morador / ${prefix}porteiro / ${prefix}prestador`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
