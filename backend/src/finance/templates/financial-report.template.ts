import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import {
  FinancialReportData,
  FinancialReportRepository,
  FinancialReportRequest,
  FinancialReportResult,
} from './financial-report.types';

/**
 * Design pattern: Template Method.
 *
 * Todo relatório financeiro segue exatamente o mesmo algoritmo:
 * 1) verificar permissão de manager;
 * 2) buscar os dados do período;
 * 3) calcular os indicadores específicos;
 * 4) formatar a resposta.
 *
 * As subclasses só implementam o cálculo e a apresentação que variam entre
 * os tipos de relatório.
 */
export abstract class FinancialReportTemplate {
  constructor(protected readonly repo: FinancialReportRepository) {}

  async generate(
    request: FinancialReportRequest,
    actor: AuthenticatedUser,
  ): Promise<FinancialReportResult> {
    await this.checkPermission(actor);
    const data = await this.fetchData(request);
    const calculated = await this.calculate(data, request);
    return this.formatResponse(calculated, request, actor);
  }

  protected async checkPermission(actor: AuthenticatedUser): Promise<void> {
    const allowed = await this.repo.hasManagerPermission(actor);
    if (!allowed) {
      throw new ForbiddenException('Only managers can generate financial reports');
    }
  }

  protected async fetchData(request: FinancialReportRequest): Promise<FinancialReportData> {
    return { expenses: await this.repo.fetchExpenses(request) };
  }

  protected abstract calculate(
    data: FinancialReportData,
    request: FinancialReportRequest,
  ): Promise<Record<string, unknown>> | Record<string, unknown>;

  protected abstract formatResponse(
    calculated: Record<string, unknown>,
    request: FinancialReportRequest,
    actor: AuthenticatedUser,
  ): Promise<FinancialReportResult> | FinancialReportResult;
}
