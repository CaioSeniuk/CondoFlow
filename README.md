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

- **Backend:** Python + Django + Django REST Framework, autenticação JWT (`djangorestframework-simplejwt`), Pillow para tratamento de imagem, armazenamento de arquivos local (`MEDIA_ROOT`).
- **Frontend:** React + Vite + Tailwind CSS + React Router + TanStack Query.
- Sem Celery, Redis, WebSocket/Channels ou bucket externo — atualizações de status funcionam por polling simples do frontend.

## Estrutura do backend

O backend segue o padrão Model-Serializer-View (equivalente a MVC em uma API REST sem templates): `models.py` define os dados e regras de negócio, `serializers.py` representa os dados de entrada/saída, e `views.py` (ViewSets do DRF) atua como controller. Um app Django por domínio, todo o código em inglês:

```
backend/
├── condoflow/      # configuração do projeto (settings, urls)
├── core/           # models abstratos de auditoria (TimeStampedModel, AuditModel)
├── users/          # autenticação, perfis (resident, manager, doorman, provider)
├── announcements/  # comunicados
├── packages/       # encomendas
├── visitors/       # visitantes e QR Code
├── tickets/        # chamados de manutenção
├── providers/      # prestadores de serviço
├── reservations/   # reserva de áreas comuns
├── polls/          # enquetes
└── finance/        # financeiro
```

## Instalação e execução

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # ajuste as variáveis conforme necessário
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Variáveis de ambiente (backend/.env)

| Variável | Descrição |
|---|---|
| `SECRET_KEY` | Chave secreta do Django |
| `DEBUG` | `True`/`False` |
| `ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula |
| `DATABASE_URL` | Connection string do banco de dados (Supabase). Obrigatória — o backend não sobe sem ela |
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
| `/api/docs/` | Swagger UI — explorar e testar endpoints |
| `/api/redoc/` | Redoc — documentação em formato de leitura |
| `/api/schema/` | Schema OpenAPI bruto (YAML) |

A API é versionada sob `/api/v1/`. O schema é gerado automaticamente pelo `drf-spectacular` a
partir das ViewSets do DRF, documentadas via `extend_schema`/`extend_schema_view` (ver
`backend/core/schema.py`).

### Testes

```bash
cd backend
python manage.py test
```
