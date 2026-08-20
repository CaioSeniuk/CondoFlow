import { NotFoundException } from '@nestjs/common';
import { UserRole, Visitor } from '@prisma/client';
import { VisitorsService } from './visitors.service';
import { AccessLogRepository, VisitorsRepository } from './visitors.repository';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

const residentA101: AuthenticatedUser = {
  id: 1n,
  username: 'resident1',
  role: UserRole.resident,
  block: 'A',
  apartment: '101',
};

/** Visitante cadastrado para o bloco B, apto 202 — de outro morador. */
const otherVisitor = {
  id: 10n,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: 2n,
  updatedById: null,
  name: 'John Doe',
  document: '123.456.789-00',
  block: 'B',
  apartment: '202',
  token: '0d5f1b6e-1111-2222-3333-444455556666',
  validFrom: new Date(),
  validUntil: new Date(),
} as Visitor;

function makeService(repo: Partial<VisitorsRepository>) {
  return new VisitorsService(
    {
      findById: jest.fn().mockResolvedValue(otherVisitor),
      ...repo,
    } as unknown as VisitorsRepository,
    {} as AccessLogRepository,
  );
}

describe('VisitorsService — escopo por bloco/apartamento', () => {
  it("does not expose another apartment's visitor to a resident", async () => {
    const service = makeService({});

    // Documento e token de QR Code não podem vazar só por chutar o id.
    await expect(service.findByIdForUser(10n, residentA101)).resolves.toBeNull();
  });

  it("does not let a resident update another apartment's visitor", async () => {
    const update = jest.fn();
    const service = makeService({ update });

    await expect(service.update(10n, { name: 'hacked' }, residentA101)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("does not let a resident delete another apartment's visitor", async () => {
    const remove = jest.fn();
    const service = makeService({ remove });

    await expect(service.remove(10n, residentA101)).rejects.toBeInstanceOf(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('exposes the visitor to the resident of the same block/apartment', async () => {
    const service = makeService({});
    const owner = { ...residentA101, block: 'B', apartment: '202' };

    await expect(service.findByIdForUser(10n, owner)).resolves.toEqual(otherVisitor);
  });

  it('exposes every visitor to managers and doormen', async () => {
    const service = makeService({});

    await expect(
      service.findByIdForUser(10n, { ...residentA101, role: UserRole.manager }),
    ).resolves.toEqual(otherVisitor);
    await expect(
      service.findByIdForUser(10n, { ...residentA101, role: UserRole.doorman }),
    ).resolves.toEqual(otherVisitor);
  });

  it('hides visitors from providers', async () => {
    const service = makeService({});

    await expect(
      service.findByIdForUser(10n, { ...residentA101, role: UserRole.provider }),
    ).resolves.toBeNull();
  });
});
