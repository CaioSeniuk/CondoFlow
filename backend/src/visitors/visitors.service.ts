import { Injectable } from '@nestjs/common';
import { AccessDirection, UserRole, Visitor } from '@prisma/client';
import { auditOnCreate } from '../common/audit';
import { assertVisible } from '../common/access';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AccessLogRepository, VisitorsRepository } from './visitors.repository';
import { CreateVisitorDto } from './dto/visitor.dto';
import { buildTokenValidationChain, isWithinValidityWindow } from './token-validation.chain';

@Injectable()
export class VisitorsService {
  private readonly tokenValidationChain = buildTokenValidationChain();

  constructor(
    private repo: VisitorsRepository,
    private accessLogRepo: AccessLogRepository,
  ) {}

  listForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.resident) {
      return this.repo.filterByBlockApartment(user.block, user.apartment);
    }
    if (user.role === UserRole.manager || user.role === UserRole.doorman) {
      return this.repo.all();
    }
    return Promise.resolve([]);
  }

  /**
   * Mesmo escopo do `listForUser`: morador só enxerga visitante do próprio
   * bloco/apartamento. Sem isto, qualquer morador leria o documento e o token de
   * QR Code de visitantes de outros apartamentos só chutando o id.
   */
  private canAccess(visitor: Visitor, user: AuthenticatedUser): boolean {
    if (user.role === UserRole.manager || user.role === UserRole.doorman) return true;
    if (user.role === UserRole.resident) {
      return visitor.block === user.block && visitor.apartment === user.apartment;
    }
    return false;
  }

  async findByIdForUser(id: bigint, user: AuthenticatedUser): Promise<Visitor | null> {
    const visitor = await this.repo.findById(id);
    if (!visitor || !this.canAccess(visitor, user)) return null;
    return visitor;
  }

  create(dto: CreateVisitorDto, user: AuthenticatedUser) {
    return this.repo.create({ ...dto, ...auditOnCreate(user) });
  }

  async update(id: bigint, dto: Partial<CreateVisitorDto>, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.update(id, { ...dto, updatedById: user.id });
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    assertVisible(await this.findByIdForUser(id, user));
    return this.repo.remove(id);
  }

  isValid(visitor: Visitor) {
    return isWithinValidityWindow(visitor, new Date());
  }

  async validateToken(token: string, direction: AccessDirection, actor: AuthenticatedUser) {
    const visitor = await this.repo.findByToken(token);
    this.tokenValidationChain.handle({ visitor, now: new Date() });

    const accessLog = await this.accessLogRepo.create(visitor!.id, direction, actor.id);
    return { visitor: visitor!, accessLog };
  }
}
