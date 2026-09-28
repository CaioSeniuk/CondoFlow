# Template Method — implementação no CondoFlow

Este documento resume a portagem do padrão **Template Method** do projeto de
referência `design-pattern-implementation/backend` para o CondoFlow, feita na
branch `design-pattern-implementation`. Toda a implementação é **aditiva**:
nenhuma rota, DTO, service ou repository existentes foram alterados em
comportamento — apenas novos arquivos e novos endpoints foram acrescentados.

## O padrão

Template Method define o esqueleto de um algoritmo em um método de uma classe
base (abstrata), delegando alguns dos passos para subclasses. Isso permite que
subclasses redefinam certas etapas do algoritmo sem mudar sua estrutura geral.

Três exemplos foram portados, um por módulo:

## 1. Tickets — ações sobre chamados

- **Local**: `backend/src/tickets/processors/`
- **Classe base**: `TicketActionTemplate` (`executeAction`) — carrega o
  chamado, garante que ele está no escopo do ator, delega a ação
  específica do papel, persiste, registra histórico e notifica.
- **Subclasses**: `ResidentTicketActionProcessor` (editar enquanto `open`),
  `ManagerTicketActionProcessor` (atribuir prestador / validar transição de
  status via `StatusTransitionHandler` já existente),
  `ProviderTicketActionProcessor` (avançar para `in_progress`/`resolved`).
- **Integração**: os arquivos usam exatamente as mesmas interfaces do
  CondoFlow (`TicketsRepository`, `StatusHistoryRepository`,
  `StatusTransitionHandler`), então foram portados quase sem alteração.
  `TicketsService.performAction` foi adicionado e um novo endpoint
  `POST /api/v1/tickets/:id/actions` foi criado em `TicketsController`.
- **Sem adaptação de domínio**: compatível 1:1 com os tipos reais.

## 2. Finance — relatórios financeiros

- **Local**: `backend/src/finance/templates/`
- **Classe base**: `FinancialReportTemplate` (`generate`) — verifica
  permissão de manager, busca dados, calcula agregações, formata o
  relatório.
- **Subclasses**: `CategoryExpenseReport` (despesas por categoria),
  `BudgetVsActualReport` (orçado vs. realizado).
- **Adaptação de domínio necessária**: o template original modela despesas
  como `ExpenseRecord{category: string, amount: number, date: Date}`,
  enquanto o schema Prisma real usa
  `Expense{categoryId, referenceMonth, budgetedAmount, actualAmount}`
  relacionado a `ExpenseCategory.name`. Foi criado o adaptador
  `PrismaFinancialReportRepository` (`backend/src/finance/finance-report.repository.ts`)
  que:
  - mapeia `amount` do relatório para `actualAmount` (valor realizado);
  - agrega `budgetedAmount` por categoria para o relatório de orçamento.
- **Endpoint novo**: `POST /api/v1/finance/reports/:type`
  (`category-expense` | `budget-vs-actual`), exposto por
  `FinancialReportsController`/`FinancialReportsService` novos — não
  substitui o CRUD existente de despesas/categorias.

## 3. Announcements — publicação de comunicados

- **Local**: `backend/src/announcements/templates/`
- **Classe base**: `AnnouncementPublisherTemplate` (`publish`) — valida
  segmentação via Chain of Responsibility, formata a mensagem, salva,
  configura rastreamento de leitura.
- **Subclasses**: `StandardAnnouncementPublisher`,
  `UrgentAnnouncementPublisher` (prefixa título/corpo e força
  `urgent: true`/`trackReads: true`).
- **Adaptação de domínio necessária**: o template original modela
  `Announcement{body, audience: 'all'|'residents'|'providers'|'managers'}`,
  enquanto o schema Prisma real usa
  `Announcement{message, segment: 'all'|'block'|'apartment', block, apartment}` —
  não existe segmentação por papel de usuário no modelo atual. Foram
  criados dois adaptadores:
  - `PrismaAnnouncementRepository`
    (`backend/src/announcements/announcement-publisher.repository.ts`):
    só aceita `audience: 'all'` (mapeado para `segment: 'all'`); qualquer
    outro valor retorna `400 Bad Request`. `configureReadTracking` é um
    no-op documentado, pois o schema atual já cria `ReadConfirmation` sob
    demanda em `AnnouncementsRepository.confirmRead`.
  - `PrismaAnnouncementVisibilityChain`
    (`backend/src/announcements/announcement-visibility.adapter.ts`):
    aplica a mesma restrição de `audience` na etapa de validação do
    template.
- **Endpoint novo**: `POST /api/v1/announcements/publish/:type`
  (`standard` | `urgent`), exposto por
  `AnnouncementPublisherController`/`AnnouncementPublisherService` novos —
  não substitui o CRUD existente de comunicados.

## Decisões e limitações assumidas

- Os novos endpoints são protegidos apenas pelo `JwtAuthGuard` global (já
  registrado em `app.module.ts`); não há guard de papel adicional. No caso
  de finance, a checagem de permissão de manager é feita dentro do próprio
  template (`hasManagerPermission`).
- A restrição de `audience` a apenas `'all'` em announcements é
  deliberada: o schema atual não tem um conceito de audiência por papel de
  usuário, e mapear incorretamente (ex.: silenciosamente tratar
  `'residents'` como `'all'`) mudaria a semântica do comunicado. Preferiu-se
  recusar com erro explícito a fazer isso de forma implícita.
- Todos os novos endpoints têm exemplos de requisição documentados no
  Swagger (`@ApiBody`), seguindo o mesmo padrão usado no resto do projeto.

## Testes e validação

- `npm run build` (nest build) passa sem erros após cada módulo portado.
- As suítes de teste existentes de `tickets` e `announcements` continuam
  passando (`npx jest tickets --silent`, `npx jest announcements --silent`).
  `finance` não possuía suíte de testes prévia.
