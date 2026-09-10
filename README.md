# CondoFlow

CondoFlow é um sistema de gestão condominial que centraliza a comunicação entre síndico, moradores, portaria e prestadores de serviço, substituindo o fluxo fragmentado de WhatsApp, ligações e planilhas manuais por uma experiência digital única.

## Problema

Em condomínios, informações importantes se perdem em grupos de WhatsApp cheios de mensagens irrelevantes, chamados de manutenção não têm acompanhamento de status, encomendas dependem de aviso manual da portaria e a autorização de visitantes exige ligação telefônica. O síndico acumula solicitações sem conseguir priorizar, e prestadores de serviço recebem pedidos incompletos, sem foto ou localização exata do problema.

## Principais funcionalidades

- Comunicados segmentados por bloco/apartamento, com confirmação de leitura para itens urgentes
- Gestão de encomendas com notificação automática e registro de retirada
- Autorização de visitantes por QR Code com validade de data/horário
- Abertura e acompanhamento de chamados de manutenção/ocorrência com histórico rastreável
- Cadastro e atribuição de prestadores de serviço
- Reserva de áreas comuns sem conflito de agendamento
- Enquetes e votações
- Visualização de informações financeiras do condomínio (despesas por categoria, orçado x realizado)
- Controle de acesso por perfil (morador, síndico, porteiro, prestador)

## Contexto do projeto

Projeto acadêmico desenvolvido na disciplina de Medição e Análise de Processos e Produtos de Software (Engenharia de Software), com abordagem de Design Thinking: personas, mapa de empatia, storyboard e protótipo de interface.

## Stack

- **Backend:** Node.js 26 + NestJS (TypeScript) + Prisma ORM, banco PostgreSQL no Supabase, autenticação JWT (`@nestjs/passport` + `passport-jwt`), validação com Zod (`nestjs-zod`), arquivos (fotos e documentos) armazenados no Supabase Storage via SDK S3.
- **Frontend:** React + Vite + Tailwind CSS + React Router + TanStack Query.
- Sem Celery, Redis, WebSocket/Channels ou bucket externo — atualizações de status funcionam por polling simples do frontend.

> O backend foi migrado de Django/DRF para NestJS mantendo os mesmos endpoints, regras de negócio
> e o banco Supabase existente. A implementação Python continua disponível na branch `dev`.

## Estrutura do backend

Um módulo NestJS por domínio, cada um em quatro camadas — `*.controller.ts` (rotas e guards),
`*.service.ts` (regras de negócio e escopo por perfil), `*.repository.ts` (acesso ao banco via
Prisma) e `dto/` (schemas Zod de entrada). Todo o código em inglês:

```
backend/
├── prisma/schema.prisma  # espelha as tabelas existentes no Supabase (@@map/@map)
└── src/
    ├── config/           # validação das variáveis de ambiente (Zod)
    ├── prisma/           # PrismaService global
    ├── storage/          # upload para o Supabase Storage (S3)
    ├── auth/             # JWT, RolesGuard, compatibilidade com hashes PBKDF2 do Django
    ├── common/           # auditoria (created_by/updated_by) e paginação
    ├── users/            # autenticação, perfis (resident, manager, doorman, provider)
    ├── announcements/    # comunicados
    ├── packages/         # encomendas
    ├── visitors/         # visitantes e QR Code
    ├── tickets/          # chamados de manutenção
    ├── providers/        # prestadores de serviço
    ├── reservations/     # reserva de áreas comuns
    ├── polls/            # enquetes
    └── finance/          # financeiro
```

## Design pattern: Chain of Responsibility

Regras de validação em etapas encadeadas usam o padrão **Chain of Responsibility**, com um
`Handler<TRequest, TResult>` abstrato único (`backend/src/common/handler.ts`) reaproveitado pelos
três exemplos abaixo — cada handler concreto resolve sua checagem ou delega para o próximo elo via
`super.handle(request)`:

| Domínio | Chain | Handlers |
|---|---|---|
| Visitantes | `visitors/token-validation.chain.ts` | `VisitorExistsHandler` → `TokenWithinValidityWindowHandler` |
| Chamados | `tickets/status-transition.chain.ts` | `NoNoOpTransitionHandler` → `NotAlreadyResolvedHandler` → `RequiresProviderHandler` |
| Comunicados | `announcements/visibility.chain.ts` | `AllSegmentHandler` → `BlockSegmentHandler` → `ApartmentSegmentHandler` |

A validação de visitantes e a resolução de visibilidade de comunicados são refactors de lógica já
existente; a de chamados introduz uma regra nova em `TicketsService.changeStatus`: não permite
manter o mesmo status (no-op), não permite alterar um chamado já resolvido e exige prestador
atribuído antes de mover para `in_progress`/`resolved`. Cada chain tem spec própria
(`*.chain.spec.ts`) cobrindo os handlers isoladamente.

## Instalação e execução

### Backend (Docker — recomendado)

Não exige Node 26 instalado na máquina:

```bash
cp backend/.env.example backend/.env   # preencha as credenciais do Supabase
docker compose up --build
```

### Backend (local, requer Node 26)

```bash
cd backend
npm install
cp .env.example .env             # preencha as credenciais do Supabase
npx prisma generate
npm run start:dev
```

### Variáveis de ambiente (backend/.env)

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão `8000`) |
| `NODE_ENV` | `development`/`production`/`test` |
| `JWT_ACCESS_SECRET` | Segredo usado para assinar o access token |
| `JWT_REFRESH_SECRET` | Segredo usado para assinar o refresh token |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token (padrão `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token (padrão `7d`) |
| `DATABASE_URL` | Connection string do pooler Supabase (transaction-mode/pgbouncer, porta `6543`). Obrigatória — o backend não sobe sem ela |
| `DIRECT_URL` | Connection string direta ao Postgres (session-mode, porta `5432`), usada por `prisma db pull`/`migrate` (pgbouncer não suporta essas operações) |
| `SUPABASE_S3_ACCESS_KEY_ID` | Access key da conexão S3 do Supabase Storage |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Secret key da conexão S3 do Supabase Storage |
| `SUPABASE_S3_BUCKET_NAME` | Nome do bucket onde ficam fotos e documentos |
| `SUPABASE_S3_ENDPOINT_URL` | Endpoint S3 do projeto Supabase |
| `SUPABASE_S3_REGION` | Região do bucket (padrão `us-east-1`) |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas para o frontend consumir a API |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # ajuste VITE_API_URL se necessário
npm run dev
```

### Documentação da API (Swagger)

Com o backend rodando, a documentação interativa de cada endpoint (parâmetros, corpo de
requisição, respostas, autenticação) fica disponível em:

| URL | Descrição |
|---|---|
| `/api/docs` | Swagger UI — explorar e testar endpoints |
| `/api/docs-json` | Schema OpenAPI bruto (JSON) |

A API é versionada sob `/api/v1/`. O schema é gerado automaticamente pelo `@nestjs/swagger` a
partir dos controllers, documentados via `@ApiTags`/`@ApiOperation`.

Endpoints de listagem devolvem o mesmo envelope paginado da implementação anterior
(`{count, next, previous, results}`, 20 itens por página, parâmetro `?page=`).

### Autenticação

`POST /api/v1/token` devolve o par `{access, refresh}`; `POST /api/v1/token/refresh` rotaciona o
par. Usuários criados na versão Django continuam conseguindo logar: a senha em PBKDF2 é validada
e re-hasheada para bcrypt no primeiro login bem-sucedido, sem precisar de reset em massa.

### Testes

```bash
cd backend
npm run test        # regras de negócio (conflito de reserva, QR Code expirado, voto único, ...)
npm run lint:check
npm run typecheck
```

A pipeline em `.github/workflows/backend-ci.yml` roda os mesmos passos no Node 26 e valida o build
da imagem Docker. Nenhuma etapa da CI conecta no Supabase real.
