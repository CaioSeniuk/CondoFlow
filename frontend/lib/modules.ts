import type { UserRole } from './types';

export type ModuleKey = 'announcements' | 'packages' | 'visitors' | 'access-logs' |
  'tickets' | 'providers' | 'evidences' | 'common-areas' | 'reservations' |
  'polls' | 'finance' | 'categories' | 'notifications' | 'history';

export interface DomainRecord {
  id: string;
  [key: string]: unknown;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'datetime-local' | 'checkbox' | 'file' | 'select' | 'options';
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
  reference?: { path: string; labelKey: string; role?: UserRole };
  source?: string;
  createOnly?: boolean;
  accept?: string;
  defaultValue?: string;
  omitEmpty?: boolean;
}

export interface ModuleDefinition {
  key: ModuleKey;
  title: string;
  description: string;
  path: string;
  roles: UserRole[];
  createRoles: UserRole[];
  editRoles: UserRole[];
  titleKey: string;
  fields: FieldDefinition[];
  details: { key: string; label: string }[];
  multipart?: boolean;
}

const manager: UserRole[] = ['manager'];
const residents: UserRole[] = ['resident', 'manager'];
const reception: UserRole[] = ['resident', 'manager', 'doorman'];
const services: UserRole[] = ['resident', 'manager', 'provider'];
const everyone: UserRole[] = ['resident', 'manager', 'doorman', 'provider'];
const blockFields: FieldDefinition[] = [
  { key: 'block', label: 'Bloco', required: true, maxLength: 10 },
  { key: 'apartment', label: 'Apartamento', required: true, maxLength: 10 },
];
const description: FieldDefinition = { key: 'description', label: 'Descrição', type: 'textarea' };
const photo: FieldDefinition = { key: 'photo', label: 'Foto', type: 'file', createOnly: true, accept: 'image/*' };
const period: FieldDefinition[] = [
  { key: 'startTime', label: 'Início', type: 'datetime-local', required: true },
  { key: 'endTime', label: 'Fim', type: 'datetime-local', required: true },
];

export const statusLabels: Record<string, string> = {
  all: 'Todos', block: 'Bloco', apartment: 'Apartamento', low: 'Baixa', medium: 'Média', high: 'Alta',
  open: 'Aberto', under_review: 'Em análise', provider_assigned: 'Prestador atribuído',
  in_progress: 'Em andamento', resolved: 'Resolvido', pending: 'Aguardando retirada',
  picked_up: 'Retirada registrada', confirmed: 'Confirmada', cancelled: 'Cancelada',
  entry: 'Entrada', exit: 'Saída',
};

export const modules: ModuleDefinition[] = [
  {
    key: 'notifications', title: 'Notificações', description: 'Atividades recentes dos módulos aos quais você tem acesso.',
    path: '', roles: everyone, createRoles: [], editRoles: [], titleKey: 'title', fields: [], details: [],
  },
  {
    key: 'history', title: 'Histórico geral', description: 'Registro cronológico de atividades disponíveis para seu perfil.',
    path: '', roles: everyone, createRoles: [], editRoles: [], titleKey: 'title', fields: [], details: [],
  },
  {
    key: 'announcements', title: 'Comunicados', description: 'Avisos do condomínio e confirmações de leitura.',
    path: '/announcements', roles: everyone, createRoles: manager, editRoles: manager, titleKey: 'title',
    fields: [
      { key: 'title', label: 'Título', required: true, maxLength: 200 },
      { key: 'message', label: 'Mensagem', type: 'textarea', required: true },
      { key: 'segment', label: 'Destinatários', type: 'select', defaultValue: 'all',
        options: ['all', 'block', 'apartment'].map((value) => ({ value, label: statusLabels[value] })) },
      ...blockFields.map((field) => ({ ...field, required: false })),
      { key: 'urgent', label: 'Urgente', type: 'checkbox' },
    ],
    details: [{ key: 'message', label: 'Mensagem' }, { key: 'segment', label: 'Destinatários' },
      { key: 'block', label: 'Bloco' }, { key: 'apartment', label: 'Apartamento' }, { key: 'urgent', label: 'Urgente' },
      { key: 'confirmedByMe', label: 'Leitura confirmada' }],
  },
  {
    key: 'packages', title: 'Encomendas', description: 'Recebimento, consulta e retirada de encomendas.',
    path: '/packages', roles: reception, createRoles: ['doorman'], editRoles: ['doorman'], titleKey: 'description', multipart: true,
    fields: [...blockFields, { ...description, maxLength: 200 }, { ...photo, required: true }],
    details: [{ key: 'block', label: 'Bloco' }, { key: 'apartment', label: 'Apartamento' },
      { key: 'status', label: 'Situação' }, { key: 'pickedUpBy', label: 'Retirado por' },
      { key: 'pickedUpAt', label: 'Retirada em' }],
  },
  {
    key: 'visitors', title: 'Visitantes', description: 'Autorize visitas e compartilhe o token de acesso e QR Code.',
    path: '/visitors', roles: reception, createRoles: ['resident'], editRoles: ['resident'], titleKey: 'name',
    fields: [{ key: 'name', label: 'Nome', required: true, maxLength: 150 },
      { key: 'document', label: 'Documento', maxLength: 30 }, ...blockFields,
      { key: 'validFrom', label: 'Válido a partir de', type: 'datetime-local', required: true },
      { key: 'validUntil', label: 'Válido até', type: 'datetime-local', required: true }],
    details: [{ key: 'document', label: 'Documento' }, { key: 'block', label: 'Bloco' },
      { key: 'apartment', label: 'Apartamento' }, { key: 'validFrom', label: 'Válido a partir de' },
      { key: 'validUntil', label: 'Válido até' }, { key: 'isValid', label: 'Acesso válido agora' }],
  },
  {
    key: 'access-logs', title: 'Controle de acesso', description: 'Valide tokens de visitantes e acompanhe entradas e saídas.',
    path: '/visitors/access-logs', roles: ['manager', 'doorman'], createRoles: [], editRoles: [], titleKey: 'visitorId',
    fields: [], details: [{ key: 'visitorId', label: 'Visitante (ID)' }, { key: 'direction', label: 'Movimento' },
      { key: 'registeredAt', label: 'Registrado em' }, { key: 'registeredById', label: 'Responsável (ID)' }],
  },
  {
    key: 'tickets', title: 'Chamados', description: 'Solicitações de manutenção, atribuição e acompanhamento do serviço.',
    path: '/tickets', roles: services, createRoles: ['resident'], editRoles: residents, titleKey: 'category', multipart: true,
    fields: [{ key: 'category', label: 'Categoria', required: true, maxLength: 100 },
      { key: 'location', label: 'Local', required: true, maxLength: 150 }, { ...description, required: true },
      { key: 'urgency', label: 'Urgência', type: 'select', defaultValue: 'low',
        options: ['low', 'medium', 'high'].map((value) => ({ value, label: statusLabels[value] })) }, photo],
    details: [{ key: 'location', label: 'Local' }, { key: 'description', label: 'Descrição' },
      { key: 'urgency', label: 'Urgência' }, { key: 'status', label: 'Situação' }, { key: 'providerId', label: 'Prestador (ID)' }],
  },
  {
    key: 'providers', title: 'Prestadores', description: 'Contratos, contatos e vínculo com contas de prestadores.',
    path: '/providers', roles: ['manager', 'provider'], createRoles: manager, editRoles: manager, titleKey: 'name', multipart: true,
    fields: [{ key: 'name', label: 'Nome', required: true, maxLength: 150 },
      { key: 'contractNumber', label: 'Número do contrato', maxLength: 50 },
      { key: 'contact', label: 'Contato', maxLength: 100 },
      { key: 'user', label: 'Conta do prestador', type: 'select', source: 'userId',
        reference: { path: '/users', labelKey: 'username', role: 'provider' } },
      { key: 'document', label: 'Documento do contrato', type: 'file' }],
    details: [{ key: 'contractNumber', label: 'Contrato' }, { key: 'contact', label: 'Contato' }, { key: 'userId', label: 'Conta (ID)' }],
  },
  {
    key: 'evidences', title: 'Evidências', description: 'Fotos de antes/depois e registros dos serviços realizados.',
    path: '/providers/evidences', roles: services, createRoles: ['provider'], editRoles: ['provider'], titleKey: 'notes', multipart: true,
    fields: [{ key: 'ticket', label: 'Chamado', type: 'select', required: true, source: 'ticketId', createOnly: true,
      reference: { path: '/tickets', labelKey: 'category' } },
    { key: 'notes', label: 'Observações', type: 'textarea' },
    { key: 'beforePhoto', label: 'Foto antes', type: 'file', accept: 'image/*' },
    { key: 'afterPhoto', label: 'Foto depois', type: 'file', accept: 'image/*' }],
    details: [{ key: 'ticketId', label: 'Chamado (ID)' }, { key: 'notes', label: 'Observações' }],
  },
  {
    key: 'common-areas', title: 'Áreas comuns', description: 'Espaços do condomínio disponíveis para reservas.',
    path: '/reservations/common-areas', roles: everyone, createRoles: manager, editRoles: manager, titleKey: 'name',
    fields: [{ key: 'name', label: 'Nome', required: true, maxLength: 100 }, description],
    details: [{ key: 'description', label: 'Descrição' }],
  },
  {
    key: 'reservations', title: 'Reservas', description: 'Agende áreas comuns e consulte seus horários reservados.',
    path: '/reservations', roles: residents, createRoles: ['resident'], editRoles: residents, titleKey: 'commonArea',
    fields: [{ key: 'commonArea', label: 'Área comum', type: 'select', required: true, source: 'commonAreaId',
      reference: { path: '/reservations/common-areas', labelKey: 'name' } }, ...period],
    details: [{ key: 'commonArea', label: 'Área comum' }, { key: 'resident', label: 'Morador' },
      { key: 'startTime', label: 'Início' }, { key: 'endTime', label: 'Fim' }, { key: 'status', label: 'Situação' }],
  },
  {
    key: 'polls', title: 'Enquetes', description: 'Participe das decisões do condomínio e acompanhe os resultados.',
    path: '/polls', roles: residents, createRoles: manager, editRoles: manager, titleKey: 'question',
    fields: [{ key: 'question', label: 'Pergunta', required: true, maxLength: 200 },
      { key: 'closesAt', label: 'Encerramento', type: 'datetime-local' },
      { key: 'options', label: 'Opções (uma por linha, mínimo de duas)', type: 'options', required: true, createOnly: true }],
    details: [{ key: 'closesAt', label: 'Encerramento' }, { key: 'votedByMe', label: 'Você já votou' }],
  },
  {
    key: 'finance', title: 'Finanças', description: 'Transparência das despesas e comparação entre valores orçados e realizados.',
    path: '/finance', roles: residents, createRoles: manager, editRoles: manager, titleKey: 'description',
    fields: [{ key: 'category', label: 'Categoria', type: 'select', required: true, source: 'categoryId',
      reference: { path: '/finance/categories', labelKey: 'name' } },
    { ...description, maxLength: 200 }, { key: 'referenceMonth', label: 'Mês de referência', type: 'date', required: true },
    { key: 'budgetedAmount', label: 'Valor orçado (R$)', type: 'number', required: true, defaultValue: '0' },
    { key: 'actualAmount', label: 'Valor realizado (R$)', type: 'number', required: true, defaultValue: '0' }],
    details: [{ key: 'category', label: 'Categoria' }, { key: 'referenceMonth', label: 'Referência' },
      { key: 'budgetedAmount', label: 'Orçado' }, { key: 'actualAmount', label: 'Realizado' }],
  },
  {
    key: 'categories', title: 'Categorias financeiras', description: 'Organize a classificação das despesas.',
    path: '/finance/categories', roles: residents, createRoles: manager, editRoles: manager, titleKey: 'name',
    fields: [{ key: 'name', label: 'Nome', required: true, maxLength: 100 }], details: [],
  },
];

export const createLabels: Partial<Record<ModuleKey, string>> = {
  announcements: 'Novo comunicado', packages: 'Registrar encomenda', visitors: 'Autorizar visitante',
  tickets: 'Novo chamado', providers: 'Cadastrar prestador', evidences: 'Anexar evidência',
  'common-areas': 'Nova área comum', reservations: 'Nova reserva', polls: 'Nova enquete',
  finance: 'Registrar despesa', categories: 'Nova categoria',
};

export function moduleFor(key: string): ModuleDefinition | undefined {
  return modules.find((item) => item.key === key);
}

export function visibleModules(role: UserRole, isSuperuser = false): ModuleDefinition[] {
  return isSuperuser ? [] : modules.filter((item) => item.roles.includes(role));
}

export function displayValue(value: unknown, key = ''): string {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    if ('name' in value && typeof value.name === 'string') return value.name;
    if ('firstName' in value) return [value.firstName, 'lastName' in value ? value.lastName : ''].filter(Boolean).join(' ');
    return 'Não informado';
  }
  if (/Amount$/.test(key)) return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const text = String(value);
  if (/At$|Time$|From$|Until$|Month$/.test(key) && !Number.isNaN(Date.parse(text))) {
    return new Date(text).toLocaleString('pt-BR', { dateStyle: 'short', ...(key === 'referenceMonth' ? { timeZone: 'UTC' } : { timeStyle: 'short' }) });
  }
  return statusLabels[text] ?? text;
}
