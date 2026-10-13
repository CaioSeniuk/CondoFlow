'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authenticatedRequest, errorMessage } from '@/lib/api';
import { listRecords, saveRecord } from '@/lib/domain-api';
import { createLabels, displayValue, moduleFor, statusLabels, type DomainRecord, type FieldDefinition, type ModuleDefinition } from '@/lib/modules';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import type { PaginatedResult, UserRole } from '@/lib/types';
import { useSession } from './SessionProvider';
import { RecordDialog, type RecordAction } from './RecordDialog';
import { VisitorQr } from './VisitorQr';
import { ActivityPage } from './ActivityPage';
import { ModuleIcon } from './ModuleIcon';
import styles from './Workspace.module.css';

function safeFileUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch { return null; }
}

function recordArray(value: unknown): DomainRecord[] {
  if (!Array.isArray(value)) return [];
  const items: unknown[] = value;
  return items.filter((item): item is DomainRecord =>
    typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string');
}

export function ModulePage({ moduleKey, recordId }: Readonly<{ moduleKey: string; recordId?: string }>) {
  const module = moduleFor(moduleKey);
  if (!module) throw new Error('Módulo desconhecido.');
  if (module.key === 'notifications' || module.key === 'history') return <ActivityPage history={module.key === 'history'} />;
  return <ResourcePage key={`${moduleKey}:${recordId ?? ''}`} module={module} recordId={recordId} />;
}

function recordAction(module: ModuleDefinition, record?: DomainRecord, deleting = false): RecordAction {
  let title = `Novo registro · ${module.title}`;
  let method: RecordAction['method'] = 'POST';
  let success = 'Registro cadastrado.';
  if (record) {
    title = `Editar ${module.title}`;
    method = 'PATCH';
    success = 'Registro atualizado.';
  }
  if (deleting) {
    title = `Excluir registro #${record?.id}`;
    method = 'DELETE';
    success = 'Registro excluído.';
  }
  const suffix = record ? '/' + encodeURIComponent(record.id) : '';
  return {
    title, method, success, record, path: module.path + suffix,
    multipart: module.multipart && !(record && (module.key === 'tickets' || module.key === 'packages')),
    fields: deleting ? [] : module.fields.filter((field) => !(record && field.createOnly)),
    message: deleting ? 'Esta ação é definitiva e pode remover registros relacionados. Deseja continuar?' : undefined,
  };
}

function matchesStatus(record: DomainRecord, filter: string) {
  switch (filter) {
    case 'all': return true;
    case 'active': return record.status !== 'resolved';
    case 'valid': return record.isValid === true;
    case 'expired': return record.isValid !== true;
    default: return record.status === filter;
  }
}

function filteredRecords(data: PaginatedResult<DomainRecord> | null, module: ModuleDefinition, search: string, status: string) {
  const query = search.toLocaleLowerCase('pt-BR');
  return data?.results.filter((record) => {
    const values = [record.id, record[module.titleKey], record.description, record.name, record.status];
    const matchesSearch = !query || values.some((value) => displayValue(value).toLocaleLowerCase('pt-BR').includes(query));
    return matchesSearch && matchesStatus(record, status);
  }) ?? [];
}

const moduleFilters: Partial<Record<ModuleDefinition['key'], string[]>> = {
  tickets: ['all', 'active', 'resolved'],
  packages: ['all', 'pending', 'picked_up'],
  visitors: ['all', 'valid', 'expired'],
};
const filterLabels: Record<string, string> = { ...statusLabels, active: 'Ativos', valid: 'Autorizados', expired: 'Expirados' };

function StatusFilters({ module, status, onChange }: Readonly<{
  module: ModuleDefinition; status: string; onChange: (value: string) => void;
}>) {
  const filters = moduleFilters[module.key];
  if (!filters) return null;
  return <div className={styles.filters} aria-label="Filtrar registros desta página">
    {filters.map((value) => <button key={value} className={status === value ? styles.filterActive : styles.filter}
      onClick={() => onChange(value)}>{filterLabels[value]}</button>)}
  </div>;
}

type ExtraAction = (title: string, endpoint: string, fields: FieldDefinition[], record?: DomainRecord) => void;
type QuickAction = (endpoint: string, payload?: Record<string, unknown>) => Promise<void>;
type OpenAction = (record?: DomainRecord, deleting?: boolean) => void;
type ModuleProps = Readonly<{ module: ModuleDefinition; role: UserRole; extra: ExtraAction }>;

function FinanceLinks({ role, extra }: Readonly<{ role: UserRole; extra: ExtraAction }>) {
  return <div className={styles.actions}>
    <Link className={styles.secondary} href="/dashboard/categories">Categorias financeiras</Link>
    {role === 'manager' && ['category-expense', 'budget-vs-actual'].map((type) =>
      <button key={type} className={styles.secondary} onClick={() => extra(
        type === 'category-expense' ? 'Despesas por categoria' : 'Orçado x realizado',
        `/finance/reports/${type}`, [
          { key: 'startDate', label: 'Data inicial', type: 'date', required: true },
          { key: 'endDate', label: 'Data final', type: 'date', required: true },
          { key: 'category', label: 'Nome da categoria (opcional)', maxLength: 100, omitEmpty: true },
        ])}>{type === 'category-expense' ? 'Relatório por categoria' : 'Relatório orçado x realizado'}</button>)}
  </div>;
}

function ModuleShortcuts({ module, role, extra }: ModuleProps) {
  switch (module.key) {
    case 'finance': return <FinanceLinks role={role} extra={extra} />;
    case 'reservations': return <p><Link href="/dashboard/common-areas">Consultar áreas comuns</Link></p>;
    case 'tickets': return <p><Link href="/dashboard/evidences">Consultar evidências dos serviços</Link></p>;
    case 'access-logs':
      return role === 'doorman' && <button className={styles.primary} onClick={() =>
        extra('Validar acesso de visitante', '/visitors/validate_token', [
          { key: 'token', label: 'Token do visitante', required: true },
          { key: 'direction', label: 'Movimento', type: 'select', required: true,
            options: [{ value: 'entry', label: 'Entrada' }, { value: 'exit', label: 'Saída' }] },
        ])}>Validar token</button>;
    default: return null;
  }
}

function reportLines(value: unknown) {
  if (!Array.isArray(value)) return [];
  const occurrences = new Map<string, number>();
  return value.map((line: unknown) => {
    const text = String(line);
    const occurrence = (occurrences.get(text) ?? 0) + 1;
    occurrences.set(text, occurrence);
    return { text, key: `${text}:${occurrence}` };
  });
}

function FinancialReport({ report }: Readonly<{ report: Record<string, unknown> }>) {
  return <section className={styles.card} aria-label="Relatório financeiro">
    <h2>{displayValue(report.title)}</h2>
    <p className={styles.muted}>Gerado em {displayValue(report.generatedAt, 'generatedAt')}</p>
    {reportLines(report.lines).map((line) => <p key={line.key}>{line.text}</p>)}
    <button className={styles.secondary} onClick={() => window.print()}>Imprimir relatório</button>
  </section>;
}

const fileLabels: Record<string, string> = {
  photo: 'Ver foto', document: 'Ver documento', beforePhoto: 'Foto antes', afterPhoto: 'Foto depois',
};

function RecordFiles({ module, record }: Readonly<{ module: ModuleDefinition; record: DomainRecord }>) {
  const keys = module.key === 'providers' ? ['document'] : ['photo', 'beforePhoto', 'afterPhoto'];
  return <>{keys.map((key) => {
    const url = safeFileUrl(record[key]);
    return url && <p key={key}><a href={url} target="_blank" rel="noopener noreferrer">{fileLabels[key]}</a></p>;
  })}</>;
}

type RecordOperationProps = Readonly<{
  module: ModuleDefinition; record: DomainRecord; role: UserRole; busy: boolean; quick: QuickAction;
}>;

function PollOptions({ module, record, role, busy, quick }: RecordOperationProps) {
  const closed = typeof record.closesAt === 'string' && Date.parse(record.closesAt) <= Date.now();
  const disabled = busy || record.votedByMe === true || closed;
  return <section aria-label={`Opções de ${displayValue(record.question)}`}>
    {recordArray(record.options).map((option) => <div className={styles.toolbar} key={option.id}>
      <p>{displayValue(option.text)} · {displayValue(option.totalVotes)} voto(s)</p>
      {role === 'resident' && <button className={styles.secondary} disabled={disabled}
        onClick={() => void quick(`${module.path}/${record.id}/vote`, { option: Number(option.id) })}>Votar em {displayValue(option.text)}</button>}
    </div>)}
  </section>;
}

function RecordExtras(props: RecordOperationProps) {
  const { module, record } = props;
  if (module.key === 'visitors' && typeof record.token === 'string') {
    return <details className={styles.expand}>
      <summary>QR Code e token de acesso</summary><VisitorQr token={record.token} />
    </details>;
  }
  if (module.key === 'tickets') {
    return <details className={styles.expand}>
      <summary>Histórico de status</summary>
      {recordArray(record.statusHistory).map((history) => <p key={history.id}>
        {displayValue(history.status)} · {displayValue(history.changedAt, 'changedAt')} · {displayValue(history.note)}
      </p>)}
    </details>;
  }
  if (module.key === 'polls') return <PollOptions {...props} />;
  return null;
}

function ticketStatusFields(role: UserRole, record: DomainRecord): FieldDefinition[] {
  const statuses = role === 'provider' ? ['in_progress', 'resolved']
    : ['open', 'under_review', 'provider_assigned', 'in_progress', 'resolved'];
  const options = statuses
    .filter((value) => value !== record.status && (!['in_progress', 'resolved', 'provider_assigned'].includes(value) || !!record.providerId))
    .map((value) => ({ value, label: statusLabels[value] }));
  return [
    { key: 'status', label: 'Novo status', type: 'select', required: true, options },
    { key: 'note', label: 'Observação', type: 'textarea', maxLength: 250 },
  ];
}

function TicketActions({ module, record, role, extra }: Readonly<{
  module: ModuleDefinition; record: DomainRecord; role: UserRole; extra: ExtraAction;
}>) {
  if (record.status === 'resolved' || (role !== 'manager' && role !== 'provider')) return null;
  const endpoint = role === 'provider' ? 'actions' : 'change_status';
  return <>
    <button className={styles.secondary} onClick={() => extra('Alterar status',
      `${module.path}/${record.id}/${endpoint}`, ticketStatusFields(role, record))}>Alterar status</button>
    {role === 'manager' && <button className={styles.secondary} onClick={() => extra('Atribuir prestador', `${module.path}/${record.id}/assign_provider`, [
      { key: 'provider', label: 'Prestador', type: 'select', required: true, reference: { path: '/providers', labelKey: 'name' } },
    ])}>Atribuir prestador</button>}
  </>;
}

type RecordActionProps = RecordOperationProps & Readonly<{ extra: ExtraAction; open: OpenAction; detail: boolean }>;

function SpecificRecordActions(props: RecordActionProps) {
  const { module, record, role, busy, quick, extra } = props;
  if (module.key === 'announcements' && role === 'resident') {
    return <button className={styles.secondary} disabled={busy || record.confirmedByMe === true}
      onClick={() => void quick(`${module.path}/${record.id}/confirm_read`)}>
      {record.confirmedByMe ? 'Leitura confirmada' : 'Confirmar leitura'}</button>;
  }
  if (module.key === 'packages' && role === 'doorman' && record.status === 'pending') {
    return <button className={styles.primary} onClick={() => extra('Registrar retirada', `${module.path}/${record.id}/pickup`, [
      { key: 'pickedUpBy', label: 'Retirado por', required: true, maxLength: 150 },
    ])}>Registrar retirada</button>;
  }
  if (module.key === 'tickets') return <TicketActions module={module} record={record} role={role} extra={extra} />;
  return null;
}

function RecordActions(props: RecordActionProps) {
  const { module, record, role, busy, open, detail } = props;
  return <div className={styles.actions}>
    {!detail && module.key !== 'access-logs' && <Link className={styles.secondary} href={`/dashboard/${module.key}/${record.id}`}>Ver detalhes #{record.id}</Link>}
    {module.editRoles.includes(role) && <>
      <button className={styles.secondary} disabled={busy} onClick={() => open(record)}>Editar registro #{record.id}</button>
      <button className={styles.danger} disabled={busy} onClick={() => open(record, true)}>Excluir registro #{record.id}</button>
    </>}
    <SpecificRecordActions {...props} />
  </div>;
}

function RecordCard(props: RecordActionProps) {
  const { module, record } = props;
  const title = displayValue(record[module.titleKey]);
  return <article className={styles.card}>
    <div className={styles.userHeading}>
      <span className={styles.iconCircle}><ModuleIcon name={module.key} /></span>
      <h2>{title === 'Não informado' ? `${module.title} #${record.id}` : title}</h2>
      <span className={styles.badge} data-status={typeof record.status === 'string' ? record.status : undefined}>
        {record.status ? displayValue(record.status) : `#${record.id}`}</span>
    </div>
    <dl className={styles.details}>{module.details.map((detail) => <div key={detail.key}>
      <dt>{detail.label}</dt><dd>{displayValue(record[detail.key], detail.key)}</dd>
    </div>)}</dl>
    <RecordFiles module={module} record={record} />
    <RecordExtras {...props} />
    <RecordActions {...props} />
  </article>;
}

function ModuleHeader({ module, role, recordId, open }: Readonly<{
  module: ModuleDefinition; role: UserRole; recordId?: string; open: OpenAction;
}>) {
  return <>
    {recordId && <p><Link className={styles.textButton} href={`/dashboard/${module.key}`}>← Voltar para {module.title.toLowerCase()}</Link></p>}
    <div className={styles.toolbar}>
      <div><h1>{module.title}</h1><p className={styles.muted}>{module.description}</p></div>
      {!recordId && module.createRoles.includes(role) && <button className={styles.primary} onClick={() => open()}>
        + {createLabels[module.key] ?? 'Novo registro'}</button>}
    </div>
  </>;
}

function Pagination({ data, page, onChange }: Readonly<{
  data: PaginatedResult<DomainRecord>; page: number; onChange: (page: number) => void;
}>) {
  return <div className={styles.pagination}>
    <button className={styles.secondary} disabled={!data.previous} onClick={() => onChange(data.previous ?? 1)}>Anterior</button>
    <span>Página {page}</span>
    <button className={styles.secondary} disabled={!data.next} onClick={() => onChange(data.next ?? page)}>Próxima</button>
  </div>;
}

function ResourcePage({ module, recordId }: Readonly<{ module: ModuleDefinition; recordId?: string }>) {
  const { user } = useSession();
  const [data, setData] = useState<PaginatedResult<DomainRecord> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<RecordAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const requestId = useRef(0);
  const path = module.path;
  const load = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const result = recordId ? {
        count: 1, next: null, previous: null,
        results: [await authenticatedRequest<DomainRecord>(`${path}/${encodeURIComponent(recordId)}`)],
      } : await listRecords(path, page);
      if (current !== requestId.current) return;
      setError(null);
      if (!result.results.length && page > 1) setPage(result.previous ?? 1);
      else setData(result);
    } catch (err) {
      if (current === requestId.current) setError(errorMessage(err));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [path, page, recordId]);
  useEffect(() => {
    setLoading(true);
    void load();
    return () => { requestId.current++; };
  }, [load]);
  useAutoRefresh(load, !action && !busy && !deleted);

  function open(record?: DomainRecord, deleting = false) {
    setAction(recordAction(module, record, deleting));
  }

  function extra(title: string, endpoint: string, fields: FieldDefinition[], record?: DomainRecord) {
    setAction({ title, path: endpoint, method: 'POST', fields, record, success: 'Operação concluída.' });
  }

  async function quick(endpoint: string, payload?: Record<string, unknown>) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await saveRecord(endpoint, 'POST', payload);
      setNotice('Operação concluída.');
      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  const results = filteredRecords(data, module, search, statusFilter);

  function saved(message: string, result: Record<string, unknown>) {
    if (!action) return;
    if (action.path.startsWith('/finance/reports/')) setReport(result);
    setAction(null); setNotice(message);
    if (recordId && action.method === 'DELETE') {
      requestId.current++;
      setDeleted(true);
      setData({ count: 0, results: [], next: null, previous: null });
    } else void load();
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    setSearch('');
  }

  return <>
    <ModuleHeader module={module} role={user.role} recordId={recordId} open={open} />
    {!recordId && <StatusFilters module={module} status={statusFilter} onChange={setStatusFilter} />}
    <p className={styles.muted}>Atualização automática a cada 15 segundos e ao voltar à aba.</p>
    {!recordId && <div className={styles.toolbar}>
      <label className={styles.field}>Buscar nesta página{' '}
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <button className={styles.secondary} disabled={busy} onClick={() => void load()}>Atualizar</button>
    </div>}
    <ModuleShortcuts module={module} role={user.role} extra={extra} />
    {notice && <output className={styles.success}>{notice}</output>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading && <output>Carregando {module.title.toLowerCase()}...</output>}
    {report && <FinancialReport report={report} />}
    {data && !recordId && <p className={styles.muted}>{data.count} registro(s)</p>}
    {!loading && data && !results.length && <section className={styles.card}>Nenhum registro encontrado.</section>}
    {results.map((record) => <RecordCard key={record.id} module={module} record={record} role={user.role}
      busy={busy} quick={quick} extra={extra} open={open} detail={!!recordId} />)}
    {data && !recordId && <Pagination data={data} page={page} onChange={changePage} />}
    {action && <RecordDialog action={action} onClose={() => setAction(null)} onSaved={saved} />}
  </>;
}
