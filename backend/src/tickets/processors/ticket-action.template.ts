import { ForbiddenException } from '@nestjs/common';
import { Ticket } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { assertVisible } from '../../common/access';
import { auditOnUpdate } from '../../common/audit';
import { StatusHistoryRepository, TicketsRepository } from '../tickets.repository';
import { TicketActionPayload, TicketActionResult } from './ticket-action.types';

/**
 * Design pattern: Template Method.
 *
 * O residente abre o chamado, o síndico (manager) valida e o prestador
 * executa o que foi solicitado — três perfis, três regras de negócio
 * diferentes, mas sempre a mesma sequência de passos ao atuar sobre um
 * chamado já existente: carregar o chamado no escopo do ator, delegar a
 * regra específica do perfil, persistir e (quando há mudança de status)
 * registrar no histórico. `executeAction` é o método template — fixo para
 * todos os perfis; `performRoleSpecificAction` é o único passo abstrato que
 * cada subclasse concreta (`ResidentTicketActionProcessor`,
 * `ManagerTicketActionProcessor`, `ProviderTicketActionProcessor`) precisa
 * implementar.
 *
 * Complementa (não substitui) a Chain of Responsibility já existente em
 * `status-transition.chain.ts`: quem muda o status de um chamado por aqui
 * continua passando pela mesma chain, reaproveitada dentro do passo
 * específico do Manager e do Provider.
 */
export abstract class TicketActionTemplate {
  constructor(
    protected readonly repo: TicketsRepository,
    protected readonly statusHistoryRepo: StatusHistoryRepository,
  ) {}

  /**
   * Método template. A ordem e o número de passos são fixos — nenhuma
   * subclasse deve (nem consegue, já que os outros métodos são `protected`)
   * alterá-la.
   */
  async executeAction(
    id: bigint,
    actor: AuthenticatedUser,
    payload: TicketActionPayload,
  ): Promise<Ticket> {
    // 1. Carrega o chamado já restrito ao escopo do perfil.
    const ticket = assertVisible(await this.loadTicketInScope(id, actor));

    // 2-3. Autorização fina + regra de negócio específica do perfil.
    const { data, historyStatus, historyNote } = await this.performRoleSpecificAction(
      ticket,
      actor,
      payload,
    );

    // 4. Persistência + auditoria — igual para qualquer perfil.
    const updated = await this.repo.update(id, { ...data, ...auditOnUpdate(actor) });

    // 5. Histórico de status — só quando a ação específica muda o status.
    if (historyStatus) {
      await this.statusHistoryRepo.create(id, historyStatus, actor.id, historyNote ?? '');
    }

    // 6. Hook opcional de notificação.
    await this.notify(updated, actor);

    return updated;
  }

  /**
   * Hook com implementação padrão: busca o chamado sem filtro adicional.
   * Resident e Provider sobrescrevem para reaproveitar os filtros que já
   * existem no `TicketsRepository` (`findByIdForResident`/`findByIdForProviderUser`),
   * garantindo o mesmo escopo por perfil usado no restante do módulo.
   */
  protected loadTicketInScope(id: bigint, _actor: AuthenticatedUser): Promise<Ticket | null> {
    return this.repo.findById(id);
  }

  /** Passo abstrato: única parte do algoritmo que de fato varia por perfil. */
  protected abstract performRoleSpecificAction(
    ticket: Ticket,
    actor: AuthenticatedUser,
    payload: TicketActionPayload,
  ): Promise<TicketActionResult> | TicketActionResult;

  /** Hook opcional: por padrão, nenhuma ação executa notificação. */
  protected async notify(_ticket: Ticket, _actor: AuthenticatedUser): Promise<void> {}

  /** Atalho usado pelas subclasses para negar uma ação fora da regra do perfil. */
  protected forbidden(message: string): never {
    throw new ForbiddenException(message);
  }
}
