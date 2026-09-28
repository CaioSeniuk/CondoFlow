# CondoFlow

CondoFlow é um sistema de gestão condominial que centraliza a comunicação entre síndico, moradores,
portaria e prestadores de serviço, substituindo o fluxo fragmentado de WhatsApp, ligações e
planilhas manuais por uma experiência digital única.

## Sumário

- [Problema](#problema)
- [Principais funcionalidades](#principais-funcionalidades)
- [Contexto do projeto](#contexto-do-projeto)
- [Stack e especificações](#stack-e-especificações)
- [Arquitetura do backend](#arquitetura-do-backend)
- [Perfis e controle de acesso](#perfis-e-controle-de-acesso)
- [Endpoints da API](#endpoints-da-api)
- [Design patterns](#design-patterns)
  - [Chain of Responsibility](#1-chain-of-responsibility)
  - [Template Method](#2-template-method)
  - [Singleton](#3-singleton)
- [Como rodar](#como-rodar)
  - [Backend (Docker)](#backend-docker--recomendado)
  - [Backend (local)](#backend-local-requer-node-26)
  - [Banco de dados e seed](#banco-de-dados-e-seed)
  - [Swagger](#documentação-da-api-swagger)
  - [Frontend](#frontend-nextjs)
  - [Testes e qualidade](#testes-e-qualidade)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [CI](#ci)

## Problema

Em condomínios, informações importantes se perdem em grupos de WhatsApp cheios de mensagens
irrelevantes, chamados de manutenção não têm acompanhamento de status, encomendas dependem de aviso
manual da portaria e a autorização de visitantes exige ligação telefônica. O síndico acumula
solicitações sem conseguir priorizar, e prestadores de serviço recebem pedidos incompletos, sem foto
ou localização exata do problema.

## Principais funcionalidades

- Comunicados segmentados por bloco/apartamento, com confirmação de leitura para itens urgentes
- Gestão de encomendas com notificação e registro de retirada
- Autorização de visitantes por QR Code com validade de data/horário e log de acesso
- Abertura e acompanhamento de chamados de manutenção com histórico de status rastreável
- Cadastro e atribuição de prestadores de serviço, com envio de evidências (fotos)
- Reserva de áreas comuns sem conflito de agendamento (lock transacional por área)
- Enquetes e votações (voto único por morador)
- Financeiro: categorias de despesa, orçado x realizado e relatórios
- Controle de acesso por perfil (morador, síndico, porteiro, prestador)

## Contexto do projeto

Projeto acadêmico desenvolvido na disciplina de Medição e Análise de Processos e Produtos de
Software (Engenharia de Software — PUCPR), com abordagem de Design Thinking (personas, mapa de
empatia, storyboard e protótipo de interface) e aplicação de padrões de projeto GoF.

## Stack e especificações

| Camada | Tecnologia |
|---|---|
| Backend | Node.js **26** + NestJS 10 (TypeScript 5) |
| ORM / Banco | Prisma 5 + PostgreSQL hospedado no **Supabase** |
| Autenticação | JWT (access + refresh) com `@nestjs/passport` + `passport-jwt`; senhas em bcrypt (com migração automática de hashes PBKDF2 do Django) |
| Validação | Zod via `nestjs-zod` (`ZodValidationPipe` global) |
| Arquivos | Supabase Storage via SDK S3 (`@aws-sdk/client-s3`) |
| Documentação | `@nestjs/swagger` (OpenAPI 3), com exemplos de requisição (`@ApiBody`) em todos os endpoints de escrita |
| Testes | Jest + ts-jest (+ Postgres efêmero no teste de concorrência de reserva) |
| Frontend | **Next.js 16** (App Router) + React 18 + TypeScript + CSS Modules |
| Infra | Dockerfile multi-stage (`node:26-alpine`) + `docker-compose.yml` + GitHub Actions |

Convenções globais (registradas em `backend/src/app.module.ts`):

- `JwtAuthGuard` como `APP_GUARD`: **toda rota exige token**, exceto as marcadas com `@Public()`
  (login, refresh e cadastro de usuário).
- `ZodValidationPipe` como `APP_PIPE`: todo `@Body()` é validado pelo DTO Zod correspondente.
- `PaginationInterceptor` como `APP_INTERCEPTOR`: listagens retornam
  `{count, next, previous, results}` (20 itens por página, parâmetro `?page=`).
- `BigInt` serializado como string no JSON (`common/bigint-serialization.ts`).
- API versionada sob `/api/v1/`.

> O backend foi migrado de Django/DRF para NestJS mantendo os mesmos endpoints, regras de negócio
> e o banco Supabase existente. A implementação Python continua disponível na branch `dev`.

## Arquitetura do backend

Um módulo NestJS por domínio, cada um em quatro camadas — `*.controller.ts` (rotas, guards e
Swagger), `*.service.ts` (regras de negócio e escopo por perfil), `*.repository.ts` (acesso ao banco
via Prisma) e `dto/` (schemas Zod de entrada). Código em inglês:

```
backend/
├── Dockerfile
├── prisma/
│   ├── schema.prisma          # espelha as tabelas existentes no Supabase (@@map/@map)
│   └── seed.ts                # cria 1 usuário de cada perfil
└── src/
    ├── main.ts                # bootstrap, CORS e Swagger (/api/docs)
    ├── app.module.ts          # guard/pipe/interceptor globais
    ├── config/                # validação das variáveis de ambiente (Zod)
    ├── prisma/                # PrismaService global
    ├── storage/               # upload para o Supabase Storage (S3)
    ├── auth/                  # JWT, RolesGuard, ManagerOrReadOnlyGuard, @Public, @Roles
    ├── common/                # Handler (CoR), NotificationManager (Singleton), auditoria, paginação, escopo
    ├── users/                 # usuários e perfis
    ├── announcements/         # comunicados (+ visibility chain, + templates/)
    ├── packages/              # encomendas
    ├── visitors/              # visitantes, QR Code e access logs (+ token validation chain)
    ├── tickets/               # chamados (+ status transition chain, + processors/)
    ├── providers/             # prestadores e evidências
    ├── reservations/          # áreas comuns e reservas (+ ReservationManager singleton)
    ├── polls/                 # enquetes e votos
    ├── finance/               # categorias, despesas (+ templates/ de relatórios)
    └── TEMPLATE_METHOD_IMPLEMENTATION.md
```

Modelos do banco (`prisma/schema.prisma`): `User`, `Announcement`, `ReadConfirmation`, `Package`,
`Visitor`, `AccessLog`, `Ticket`, `StatusHistory`, `Provider`, `Evidence`, `CommonArea`,
`Reservation`, `Poll`, `PollOption`, `Vote`, `ExpenseCategory`, `Expense`.
Enums: `UserRole`, `AnnouncementSegment`, `PackageStatus`, `AccessDirection`, `TicketUrgency`,
`TicketStatus`, `ReservationStatus`.

## Perfis e controle de acesso

| Perfil (`UserRole`) | Papel | Exemplos do que pode fazer |
|---|---|---|
| `resident` | Morador | abrir chamados, autorizar visitantes, reservar áreas, votar, confirmar leitura |
| `manager` | Síndico | CRUD de comunicados/enquetes/finanças/áreas/prestadores, mudar status e atribuir prestador em chamados |
| `doorman` | Porteiro | registrar e dar baixa em encomendas, validar QR Code de visitantes, ver access logs |
| `provider` | Prestador | ver chamados atribuídos, avançar status, enviar evidências |

Guards: `RolesGuard` + `@Roles(...)` restringe por perfil; `ManagerOrReadOnlyGuard` libera leitura
para todos os autenticados e escrita só para `manager`.

## Endpoints da API

Todos sob `/api/v1`. Detalhes de corpo, parâmetros e exemplos no Swagger.

| Módulo | Rotas |
|---|---|
| Auth | `POST /token` · `POST /token/refresh` (públicas) |
| Users | `GET /users` · `GET /users/me` · `GET /users/:id` · `POST /users` (pública) · `PATCH/DELETE /users/:id` |
| Announcements | `GET/POST /announcements` · `GET/PATCH/DELETE /announcements/:id` · `POST /announcements/:id/confirm_read` · **`POST /announcements/publish/:type`** (Template Method) |
| Packages | `GET/POST /packages` · `GET/PATCH/DELETE /packages/:id` · `POST /packages/:id/pickup` |
| Visitors | `GET/POST /visitors` · `GET/PATCH/DELETE /visitors/:id` · `POST /visitors/validate_token` · `GET /visitors/access-logs` |
| Tickets | `GET/POST /tickets` · `GET/PATCH/DELETE /tickets/:id` · `POST /tickets/:id/change_status` · `POST /tickets/:id/assign_provider` · **`POST /tickets/:id/actions`** (Template Method) |
| Providers | `GET/POST /providers` · `GET/PATCH/DELETE /providers/:id` · `GET/POST /providers/evidences` · `GET/PATCH/DELETE /providers/evidences/:id` |
| Reservations | `GET/POST /reservations/common-areas` · `GET/PATCH/DELETE /reservations/common-areas/:id` · `GET/POST /reservations` · `GET/PATCH/DELETE /reservations/:id` |
| Polls | `GET/POST /polls` · `GET/PATCH/DELETE /polls/:id` · `POST /polls/:id/vote` |
| Finance | `GET/POST /finance/categories` · `PATCH/DELETE /finance/categories/:id` · `GET/POST /finance` · `GET/PATCH/DELETE /finance/:id` · **`POST /finance/reports/:type`** (Template Method) |

## Design patterns

O projeto aplica três padrões GoF. Resumo:

| Padrão | Categoria | Onde | Problema resolvido |
|---|---|---|---|
| Chain of Responsibility | Comportamental | `common/handler.ts` + 3 chains (visitors, tickets, announcements) | Validações em etapas encadeadas, cada uma isolada e testável |
| Template Method | Comportamental | `tickets/processors/`, `finance/templates/`, `announcements/templates/` | Mesmo algoritmo com passos que variam por perfil/tipo |
| Singleton | Criacional | `common/notification-manager.singleton.ts`, `reservations/reservation-manager.singleton.ts` | Instância única e compartilhada de gerenciadores de notificação/reserva |

### 1. Chain of Responsibility

**Ideia:** o pedido percorre uma cadeia de handlers; cada um resolve sua checagem ou delega para o
próximo via `super.handle(request)`.

**Base comum:** `backend/src/common/handler.ts` — classe abstrata `Handler<TRequest, TResult>` com
`setNext()` (encadeável) e `handle()`.

| Domínio | Arquivo | Cadeia | Onde é usada |
|---|---|---|---|
| Visitantes | `visitors/token-validation.chain.ts` | `VisitorExistsHandler` → `TokenWithinValidityWindowHandler` | `VisitorsService` (`buildTokenValidationChain()`) em `POST /visitors/validate_token` |
| Chamados | `tickets/status-transition.chain.ts` | `NoNoOpTransitionHandler` → `NotAlreadyResolvedHandler` → `RequiresProviderHandler` | `TicketsService.changeStatus` e processors do Template Method (manager/provider) |
| Comunicados | `announcements/visibility.chain.ts` | `AllSegmentHandler` → `BlockSegmentHandler` → `ApartmentSegmentHandler` | `AnnouncementsService` (`isVisibleTo()`) na listagem/detalhe para moradores |

Regras de chamados: não permite manter o mesmo status (no-op), não altera chamado já `resolved` e
exige prestador atribuído antes de `in_progress`/`resolved`.
Testes: `visitors/token-validation.chain.spec.ts`, `tickets/status-transition.chain.spec.ts`,
`announcements/visibility.chain.spec.ts`.

### 2. Template Method

**Ideia:** uma classe abstrata define o esqueleto fixo do algoritmo (método template) e as
subclasses implementam apenas os passos que variam. Todos os exemplos são **aditivos** — expõem
endpoints novos sem alterar o CRUD existente. Documentação detalhada em
[`backend/src/TEMPLATE_METHOD_IMPLEMENTATION.md`](backend/src/TEMPLATE_METHOD_IMPLEMENTATION.md).

#### 2.1 Tickets — ações por perfil (`backend/src/tickets/processors/`)

- **Template:** `TicketActionTemplate.executeAction()` →
  1. carrega o chamado no escopo do ator (`loadTicketInScope` — hook);
  2. executa a regra do perfil (`performRoleSpecificAction` — **abstrato**);
  3. persiste com auditoria;
  4. grava `StatusHistory` se o status mudou;
  5. `notify` (hook opcional).
- **Subclasses:** `ResidentTicketActionProcessor` (edita enquanto `open`),
  `ManagerTicketActionProcessor` (atribui prestador / muda status via Chain of Responsibility),
  `ProviderTicketActionProcessor` (avança para `in_progress`/`resolved`).
- **Integração:** `TicketsService.performAction` escolhe o processor pelo `role` do usuário.
- **Endpoint:** `POST /api/v1/tickets/:id/actions` (resident, manager, provider).

```json
{ "status": "in_progress", "note": "Iniciando o reparo" }
```

#### 2.2 Finance — relatórios (`backend/src/finance/templates/`)

- **Template:** `FinancialReportTemplate.generate()` → `checkPermission` (só manager) →
  `fetchData` → `calculate` (**abstrato**) → `formatResponse` (**abstrato**).
- **Subclasses:** `CategoryExpenseReport` (despesas por categoria) e `BudgetVsActualReport`
  (orçado x realizado).
- **Adaptador:** `finance/finance-report.repository.ts` (`PrismaFinancialReportRepository`) mapeia
  o modelo real `Expense` para o domínio do template (`amount = actualAmount`,
  `date = referenceMonth`, `category = ExpenseCategory.name`; orçamento = soma de `budgetedAmount`).
- **Serviço/controller:** `FinancialReportsService`, `FinancialReportsController`.
- **Endpoint:** `POST /api/v1/finance/reports/:type` — `type` = `category-expense` | `budget-vs-actual`.

```json
{ "startDate": "2025-01-01", "endDate": "2025-12-31", "category": "Manutenção" }
```

#### 2.3 Announcements — publicação (`backend/src/announcements/templates/`)

- **Template:** `AnnouncementPublisherTemplate.publish()` → `validateSegmentation` (usa a chain de
  visibilidade) → `formatMessage` (**abstrato**) → `save` → `configureReadTracking`.
- **Subclasses:** `StandardAnnouncementPublisher` (normaliza título/corpo) e
  `UrgentAnnouncementPublisher` (título em maiúsculas com `⚠`, corpo com `URGENTE:`,
  `urgent = true`, leitura rastreada).
- **Adaptadores:** `announcement-publisher.repository.ts` (`PrismaAnnouncementRepository`: `body` →
  `message`, `audience 'all'` → `segment 'all'`) e `announcement-visibility.adapter.ts`
  (`PrismaAnnouncementVisibilityChain`). Como o schema não segmenta por perfil, **só
  `audience: "all"` é aceito**; os demais retornam `400`.
- **Endpoint:** `POST /api/v1/announcements/publish/:type` — `type` = `standard` | `urgent`.

```json
{ "title": "Interrupção no fornecimento de água", "body": "Hoje das 14h às 16h.", "audience": "all" }
```

### 3. Singleton

**Ideia:** garantir uma única instância de uma classe com ponto de acesso global. Implementação
clássica GoF: construtor `private`, atributo `static instance` e `getInstance()` com criação
preguiçosa (lazy).

| Classe | Arquivo | Responsabilidade | Usada em |
|---|---|---|---|
| `NotificationManager` | `backend/src/common/notification-manager.singleton.ts` | Envia (log) e guarda o histórico em memória de notificações (`enviarNotificacao`, `listarNotificacoes`) | `ReservationsService` (criar/cancelar reserva) e `PackagesService` (nova encomenda, retirada) — **a mesma instância é compartilhada entre os módulos** |
| `ReservationManager` | `backend/src/reservations/reservation-manager.singleton.ts` | Registra criação/cancelamento de reservas (`registrarReserva`, `cancelarReserva`) | `ReservationsService.create` / `ReservationsService.remove` |

Como observar: ao criar uma reserva ou encomenda, o console do backend exibe
`[Singleton] Gerenciador de ... criado` **apenas uma vez** (primeira chamada a `getInstance()`),
seguido das linhas `[Notificação] ...` / `[Singleton] Reserva ...` a cada operação.

> Observação: providers do NestJS já são singletons por padrão via injeção de dependência; aqui o
> padrão foi implementado manualmente (fora do container de DI) para fins didáticos. O histórico de
> notificações fica apenas em memória e é perdido ao reiniciar o processo.

## Como rodar

Pré-requisitos: projeto Supabase (Postgres + Storage) com as credenciais em mãos. Para rodar
localmente sem Docker é necessário **Node.js 26** (`engines` do backend).

### Backend (Docker — recomendado)

Não exige Node 26 instalado na máquina:

```bash
cp backend/.env.example backend/.env   # preencha as credenciais do Supabase
docker compose up --build
```

API em `http://localhost:8000`.

### Backend (local, requer Node 26)

```bash
cd backend
npm install
cp .env.example .env             # preencha as credenciais do Supabase
npx prisma generate
npm run start:dev                # modo watch; produção: npm run build && npm run start:prod
```

### Banco de dados e seed

O schema Prisma espelha as tabelas já existentes no Supabase. Para popular usuários de exemplo:

```bash
cd backend
SEED_PASSWORD=suaSenha npm run prisma:seed
```

Cria os usuários `sindico` (manager), `morador` (resident), `porteiro` (doorman) e `prestador`
(provider), todos com a senha definida em `SEED_PASSWORD`. `npm run prisma:studio` abre uma UI
para inspecionar o banco.

### Documentação da API (Swagger)

Com o backend rodando:

| URL | Descrição |
|---|---|
| http://localhost:8000/api/docs | Swagger UI — explorar e testar endpoints |
| http://localhost:8000/api/docs-json | Schema OpenAPI bruto (JSON) |

Passo a passo para testar rotas protegidas:

1. Em **auth**, execute `POST /api/v1/token` com `{"username": "sindico", "password": "<SEED_PASSWORD>"}`.
2. Copie o campo `access` da resposta.
3. Clique em **Authorize** (cadeado) e cole o token (Bearer).
4. Todos os endpoints de escrita trazem **exemplos de requisição** prontos no seletor
   *Examples* do corpo (`@ApiBody`), incluindo os endpoints de Template Method.

### Frontend (Next.js)

Atualmente contém a tela de login (com seletor de perfil) e dashboards placeholder por perfil
(`/dashboard/resident|manager|doorman|provider`). Consome `POST /api/v1/token` e
`GET /api/v1/users/me`, guardando os tokens no `localStorage`.

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                      # http://localhost:3000
```

Configuração necessária para integrar com o backend local:

- Em `frontend/.env.local`, aponte para a porta do backend:
  `NEXT_PUBLIC_API_URL=http://localhost:8000`
  (o valor de exemplo e o fallback em `lib/api.ts` usam `3000`, que é a porta do próprio Next).
- Em `backend/.env`, inclua a origem do Next no CORS:
  `CORS_ALLOWED_ORIGINS=http://localhost:3000`
  (o padrão do backend é `http://localhost:5173`, herdado de um frontend Vite anterior).

Outros scripts: `npm run build` / `npm run start` (produção) e `npm run lint`.

### Testes e qualidade

```bash
cd backend
npm run test          # Jest: regras de negócio, chains, acesso por perfil, auth
npm run lint:check    # ESLint sem warnings
npm run typecheck     # tsc --noEmit
npm run test:cov      # cobertura em backend/coverage
```

O teste de concorrência de reserva (`reservations.concurrency.spec.ts`) só roda com
`TEST_DATABASE_URL` apontando para um Postgres descartável; sem ela é ignorado.

## Variáveis de ambiente

`backend/.env` (validado em `src/config/env.validation.ts`):

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão `8000`) |
| `NODE_ENV` | `development`/`production`/`test` |
| `JWT_ACCESS_SECRET` | Segredo usado para assinar o access token |
| `JWT_REFRESH_SECRET` | Segredo usado para assinar o refresh token |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token (padrão `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token (padrão `7d`) |
| `DATABASE_URL` | Connection string do pooler Supabase (transaction-mode/pgbouncer, porta `6543`). Obrigatória |
| `DIRECT_URL` | Connection string direta (session-mode, porta `5432`), usada por `prisma db pull`/`migrate` |
| `SUPABASE_S3_ACCESS_KEY_ID` | Access key da conexão S3 do Supabase Storage |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Secret key da conexão S3 do Supabase Storage |
| `SUPABASE_S3_BUCKET_NAME` | Bucket onde ficam fotos e documentos |
| `SUPABASE_S3_ENDPOINT_URL` | Endpoint S3 do projeto Supabase |
| `SUPABASE_S3_REGION` | Região do bucket (padrão `us-east-1`) |
| `CORS_ALLOWED_ORIGINS` | Origens do frontend, separadas por vírgula |
| `SEED_PASSWORD` | Senha dos usuários criados por `npm run prisma:seed` |

`frontend/.env.local`:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API (ex.: `http://localhost:8000`) |

### Autenticação

`POST /api/v1/token` devolve o par `{access, refresh}`; `POST /api/v1/token/refresh` rotaciona o
par. Usuários criados na versão Django continuam conseguindo logar: a senha em PBKDF2 é validada
e re-hasheada para bcrypt no primeiro login bem-sucedido.

## CI

`.github/workflows/backend-ci.yml` roda em push/PR que alterem `backend/**`: `npm ci`,
`prisma generate`/`validate`, `lint:check`, `typecheck`, testes (com Postgres 16 efêmero para o
teste de concorrência) e `build`, além de validar o build da imagem Docker. Nenhuma etapa conecta
no Supabase real.
