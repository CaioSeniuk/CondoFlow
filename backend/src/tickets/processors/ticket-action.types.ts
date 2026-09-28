import { Prisma, TicketStatus } from '@prisma/client';

/**
 * Payload aceito pela rota genérica de ação sobre um chamado (`POST /:id/actions`).
 * Cada perfil só usa o subconjunto de campos relevante à sua etapa do fluxo:
 * Resident edita os dados enquanto o chamado ainda está aberto; Manager valida
 * e/ou atribui um prestador; Provider avança o status de execução.
 */
export interface TicketActionPayload {
  status?: TicketStatus;
  note?: string;
  providerId?: number;
  category?: string;
  location?: string;
  description?: string;
}

/**
 * Retorno do passo específico de cada perfil (`performRoleSpecificAction`):
 * os dados a persistir no chamado e, quando a ação muda o status, o par
 * status/nota a registrar no histórico.
 */
export interface TicketActionResult {
  data: Prisma.TicketUncheckedUpdateInput;
  historyStatus?: TicketStatus;
  historyNote?: string;
}
