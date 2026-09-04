import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const SEED_PASSWORD = 'condoflow123';

async function main() {
  const password = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  const sindico = await prisma.user.upsert({
    where: { username: 'sindico' },
    update: {},
    create: {
      username: 'sindico',
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
    where: { username: 'morador' },
    update: {},
    create: {
      username: 'morador',
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
    where: { username: 'porteiro' },
    update: {},
    create: {
      username: 'porteiro',
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
    where: { username: 'prestador' },
    update: {},
    create: {
      username: 'prestador',
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
      contractNumber: 'CT-0001',
      contact: '(41) 99999-0000',
      userId: prestadorUser.id,
      createdById: sindico.id,
    },
  });

  console.log('Seed concluída. Usuários criados (senha para todos: "condoflow123"):');
  console.log('  sindico / morador / porteiro / prestador');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
