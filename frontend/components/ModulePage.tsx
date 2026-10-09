'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authenticatedRequest, errorMessage } from '@/lib/api';
import { listRecords, saveRecord } from '@/lib/domain-api';
import { createLabels, displayValue, moduleFor, statusLabels, type DomainRecord, type FieldDefinition, type ModuleDefinition } from '@/lib/modules';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import type { PaginatedResult } from '@/lib/types';
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
  return Array.isArray(value) ? value.filter((item): item is DomainRecord =>
    typeof item === 'object' && item !== null && typeof item.id === 'string') : [];
}

export function ModulePage({ moduleKey, recordId }: { moduleKey: string; recordId?: string }) {
  const module = moduleFor(moduleKey);
  if (!module) throw new Error('Módulo desconhecido.');
  if (module.key === 'notifications' || module.key === 'history') return <ActivityPage history={module.key === 'history'} />;
  return <ResourcePage key={`${moduleKey}:${recordId ?? ''}`} module={module} recordId={recordId} />;
}

function ResourcePage({ module, recordId }: { module: ModuleDefinition; recordId?: string }) {
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
    setAction({
      title: deleting ? `Excluir registro #${record?.id}` : record ? `Editar ${module.title}` : `Novo registro · ${module.title}`,
      path: `${path}${record ? `/${encodeURIComponent(record.id)}` : ''}`,
      method: deleting ? 'DELETE' : record ? 'PATCH' : 'POST',
      record,
      multipart: module.multipart && !(record && (module.key === 'tickets' || module.key === 'packages')),
      fields: deleting ? [] : module.fields.filter((field) => !(record && field.createOnly)),
      message: deleting ? 'Esta ação é definitiva e pode remover registros relacionados. Deseja continuar?' : undefined,
      success: deleting ? 'Registro excluído.' : record ? 'Registro atualizado.' : 'Registro cadastrado.',
    });
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

  const results = data?.results.filter((record) => !search || [
    record.id, record[module.titleKey], record.description, record.name, record.status,
  ].some((value) => displayValue(value).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))
    .filter((record) => statusFilter === 'all' || (statusFilter === 'active' ? record.status !== 'resolved'
      : statusFilter === 'valid' ? record.isValid === true : statusFilter === 'expired' ? record.isValid !== true
        : record.status === statusFilter)) ?? [];
  const filters = module.key === 'tickets' ? ['all', 'active', 'resolved']
    : module.key === 'packages' ? ['all', 'pending', 'picked_up']
      : module.key === 'visitors' ? ['all', 'valid', 'expired'] : [];

  return <>
    {recordId && <p><Link className={styles.textButton} href={`/dashboard/${module.key}`}>← Voltar para {module.title.toLowerCase()}</Link></p>}
    <div className={styles.toolbar}>
      <div><h1>{module.title}</h1><p className={styles.muted}>{module.description}</p></div>
      {!recordId && module.createRoles.includes(user.role) && <button className={styles.primary} onClick={() => open()}>
        + {createLabels[module.key] ?? 'Novo registro'}</button>}
    </div>
    {!recordId && !!filters.length && <div className={styles.filters} aria-label="Filtrar registros desta página">
      {filters.map((value) => <button key={value} className={statusFilter === value ? styles.filterActive : styles.filter}
        onClick={() => setStatusFilter(value)}>{value === 'all' ? 'Todos' : value === 'active' ? 'Ativos'
          : value === 'valid' ? 'Autorizados' : value === 'expired' ? 'Expirados' : statusLabels[value]}</button>)}
    </div>}
    <p className={styles.muted}>Atualização automática a cada 15 segundos e ao voltar à aba.</p>
    {!recordId && <div className={styles.toolbar}>
      <label className={styles.field}>Buscar nesta página
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <button className={styles.secondary} disabled={busy} onClick={() => void load()}>Atualizar</button>
    </div>}
    {module.key === 'finance' && <div className={styles.actions}>
      <Link className={styles.secondary} href="/dashboard/categories">Categorias financeiras</Link>
      {user.role === 'manager' && ['category-expense', 'budget-vs-actual'].map((type) =>
        <button key={type} className={styles.secondary} onClick={() => extra(
          type === 'category-expense' ? 'Despesas por categoria' : 'Orçado x realizado',
          `/finance/reports/${type}`, [
            { key: 'startDate', label: 'Data inicial', type: 'date', required: true },
            { key: 'endDate', label: 'Data final', type: 'date', required: true },
            { key: 'category', label: 'Nome da categoria (opcional)', maxLength: 100, omitEmpty: true },
          ])}>{type === 'category-expense' ? 'Relatório por categoria' : 'Relatório orçado x realizado'}</button>)}
    </div>}
    {module.key === 'reservations' && <p><Link href="/dashboard/common-areas">Consultar áreas comuns</Link></p>}
    {module.key === 'tickets' && <p><Link href="/dashboard/evidences">Consultar evidências dos serviços</Link></p>}
    {module.key === 'access-logs' && user.role === 'doorman' && <button className={styles.primary} onClick={() =>
      extra('Validar acesso de visitante', '/visitors/validate_token', [
        { key: 'token', label: 'Token do visitante', required: true },
        { key: 'direction', label: 'Movimento', type: 'select', required: true,
          options: [{ value: 'entry', label: 'Entrada' }, { value: 'exit', label: 'Saída' }] },
      ])}>Validar token</button>}
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading && <p role="status">Carregando {module.title.toLowerCase()}...</p>}
    {report && <section className={styles.card} aria-label="Relatório financeiro">
      <h2>{displayValue(report.title)}</h2>
      <p className={styles.muted}>Gerado em {displayValue(report.generatedAt, 'generatedAt')}</p>
      {Array.isArray(report.lines) && report.lines.map((line, index) => <p key={index}>{String(line)}</p>)}
      <button className={styles.secondary} onClick={() => window.print()}>Imprimir relatório</button>
    </section>}
    {data && !recordId && <p className={styles.muted}>{data.count} registro(s)</p>}
    {!loading && data && !results.length && <section className={styles.card}>Nenhum registro encontrado.</section>}
    {results.map((record) => <article className={styles.card} key={record.id}>
      <div className={styles.userHeading}>
        <span className={styles.iconCircle}><ModuleIcon name={module.key} /></span>
        <h2>{displayValue(record[module.titleKey]) === 'Não informado' ? `${module.title} #${record.id}` : displayValue(record[module.titleKey])}</h2>
        <span className={styles.badge} data-status={typeof record.status === 'string' ? record.status : undefined}>
          {record.status ? displayValue(record.status) : `#${record.id}`}</span>
      </div>
      <dl className={styles.details}>{module.details.map((detail) => <div key={detail.key}>
        <dt>{detail.label}</dt><dd>{displayValue(record[detail.key], detail.key)}</dd>
      </div>)}</dl>
      {(module.key === 'providers' ? ['document'] : ['photo', 'beforePhoto', 'afterPhoto']).map((key) => {
        const url = safeFileUrl(record[key]);
        return url && <p key={key}><a href={url} target="_blank" rel="noopener noreferrer">
          {{ photo: 'Ver foto', document: 'Ver documento', beforePhoto: 'Foto antes', afterPhoto: 'Foto depois' }[key]}
        </a></p>;
      })}
      {module.key === 'visitors' && typeof record.token === 'string' && <details className={styles.expand}>
        <summary>QR Code e token de acesso</summary><VisitorQr token={record.token} />
      </details>}
      {module.key === 'tickets' && <details className={styles.expand}>
        <summary>Histórico de status</summary>
        {recordArray(record.statusHistory).map((history) => <p key={history.id}>
          {displayValue(history.status)} · {displayValue(history.changedAt, 'changedAt')} · {displayValue(history.note)}
        </p>)}
      </details>}
      {module.key === 'polls' && <section aria-label={`Opções de ${displayValue(record.question)}`}>
        {recordArray(record.options).map((option) => <div className={styles.toolbar} key={option.id}>
          <p>{displayValue(option.text)} · {displayValue(option.totalVotes)} voto(s)</p>
          {user.role === 'resident' && <button className={styles.secondary}
            disabled={busy || record.votedByMe === true || (typeof record.closesAt === 'string' && Date.parse(record.closesAt) <= Date.now())}
            onClick={() => void quick(`${path}/${record.id}/vote`, { option: Number(option.id) })}>Votar em {displayValue(option.text)}</button>}
        </div>)}
      </section>}
      <div className={styles.actions}>
        {!recordId && module.key !== 'access-logs' && <Link className={styles.secondary} href={`/dashboard/${module.key}/${record.id}`}>Ver detalhes #{record.id}</Link>}
        {module.editRoles.includes(user.role) && <>
          <button className={styles.secondary} disabled={busy} onClick={() => open(record)}>Editar registro #{record.id}</button>
          <button className={styles.danger} disabled={busy} onClick={() => open(record, true)}>Excluir registro #{record.id}</button>
        </>}
        {module.key === 'announcements' && user.role === 'resident' && <button className={styles.secondary}
          disabled={busy || record.confirmedByMe === true} onClick={() => void quick(`${path}/${record.id}/confirm_read`)}>
          {record.confirmedByMe ? 'Leitura confirmada' : 'Confirmar leitura'}</button>}
        {module.key === 'packages' && user.role === 'doorman' && record.status === 'pending' && <button className={styles.primary}
          onClick={() => extra('Registrar retirada', `${path}/${record.id}/pickup`, [
            { key: 'pickedUpBy', label: 'Retirado por', required: true, maxLength: 150 },
          ])}>Registrar retirada</button>}
        {module.key === 'tickets' && record.status !== 'resolved' && (user.role === 'manager' || user.role === 'provider') && <>
          <button className={styles.secondary} onClick={() => extra('Alterar status', `${path}/${record.id}/${user.role === 'provider' ? 'actions' : 'change_status'}`, [
            { key: 'status', label: 'Novo status', type: 'select', required: true,
              options: (user.role === 'provider' ? ['in_progress', 'resolved'] : ['open', 'under_review', 'provider_assigned', 'in_progress', 'resolved'])
                .filter((value) => value !== record.status && (!['in_progress', 'resolved', 'provider_assigned'].includes(value) || !!record.providerId))
                .map((value) => ({ value, label: statusLabels[value] })) },
            { key: 'note', label: 'Observação', type: 'textarea', maxLength: 250 },
          ])}>Alterar status</button>
          {user.role === 'manager' && <button className={styles.secondary} onClick={() => extra('Atribuir prestador', `${path}/${record.id}/assign_provider`, [
            { key: 'provider', label: 'Prestador', type: 'select', required: true, reference: { path: '/providers', labelKey: 'name' } },
          ])}>Atribuir prestador</button>}
        </>}
      </div>
    </article>)}
    {data && !recordId && <div className={styles.pagination}>
      <button className={styles.secondary} disabled={!data.previous} onClick={() => { setPage(data.previous ?? 1); setSearch(''); }}>Anterior</button>
      <span>Página {page}</span>
      <button className={styles.secondary} disabled={!data.next} onClick={() => { setPage(data.next ?? page); setSearch(''); }}>Próxima</button>
    </div>}
    {action && <RecordDialog action={action} onClose={() => setAction(null)} onSaved={(message, result) => {
      if (action.path.startsWith('/finance/reports/')) setReport(result);
      setAction(null); setNotice(message);
      if (recordId && action.method === 'DELETE') {
        requestId.current++;
        setDeleted(true);
        setData({ count: 0, results: [], next: null, previous: null });
      } else void load();
    }} />}
  </>;
}
