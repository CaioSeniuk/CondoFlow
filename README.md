# CondoFlow

CondoFlow é um sistema de gestão condominial que centraliza a comunicação entre síndico, moradores, portaria e prestadores de serviço, substituindo o fluxo fragmentado de WhatsApp, ligações e planilhas manuais por uma experiência digital única.

## Problema

Em condomínios, informações importantes se perdem em grupos de WhatsApp cheios de mensagens irrelevantes, chamados de manutenção não têm acompanhamento de status, encomendas dependem de aviso manual da portaria e a autorização de visitantes exige ligação telefônica. O síndico acumula solicitações sem conseguir priorizar, e prestadores de serviço recebem pedidos incompletos, sem foto ou localização exata do problema.

## Solução

O CondoFlow organiza esses fluxos em um só sistema, com quatro perfis de acesso:

- **Morador**: recebe comunicados segmentados, abre chamados com foto e urgência, acompanha encomendas, cadastra visitantes com QR Code de autorização, reserva áreas comuns e participa de enquetes.
- **Síndico**: gerencia comunicados, acompanha chamados em um painel com status (aberto, em análise, prestador acionado, em execução, resolvido), cadastra e aciona prestadores, cria enquetes e acompanha indicadores do condomínio.
- **Porteiro**: registra encomendas com foto, valida QR Code de visitantes e controla entrada/saída com poucos cliques.
- **Prestador de serviço**: recebe chamados atribuídos com localização, descrição, foto e prazo, e envia evidências (antes/depois) da conclusão do serviço.

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

## Requisitos não funcionais em destaque

- Interface acessível para usuários com baixa familiaridade tecnológica (fontes grandes, poucos passos, linguagem simples)
- Notificação em até 15 segundos para eventos críticos (encomendas e comunicados urgentes)
- Conformidade com a LGPD no tratamento de dados pessoais
- Histórico auditável de todas as ações críticas (autorizações, retiradas, aprovações de serviço)

## Contexto do projeto

Projeto acadêmico desenvolvido na disciplina de Medição e Análise de Processos e Produtos de Software (Engenharia de Software), com abordagem de Design Thinking: personas, mapa de empatia, storyboard e protótipo de interface.

## Stack

- **Backend:** Python + Django + Django REST Framework, autenticação JWT (`djangorestframework-simplejwt`), PostgreSQL (SQLite aceitável em desenvolvimento local), Pillow para tratamento de imagem, armazenamento de arquivos local (`MEDIA_ROOT`).
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

### Opção 1 — Docker Compose (recomendado)

```bash
docker-compose up
```

Isso sobe o backend Django (porta 8000) e o PostgreSQL. Depois, em outro terminal, aplique as migrations e crie o superusuário:

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Opção 2 — Backend local (sem Docker)

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

Por padrão, `.env.example` usa `DB_ENGINE=postgres`. Para rodar com SQLite localmente, defina `DB_ENGINE=sqlite` no `.env`.

### Variáveis de ambiente (backend/.env)

| Variável | Descrição |
|---|---|
| `SECRET_KEY` | Chave secreta do Django |
| `DEBUG` | `True`/`False` |
| `ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula |
| `DB_ENGINE` | `postgres` ou `sqlite` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Configuração do PostgreSQL (ignorado se `DB_ENGINE=sqlite`) |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas para o frontend consumir a API |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # ajuste VITE_API_URL se necessário
npm run dev
```

### Testes

```bash
cd backend
python manage.py test
```
