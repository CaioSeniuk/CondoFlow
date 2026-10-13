'use client';

import Link from 'next/link';
import { useSession } from './SessionProvider';
import { visibleModules } from '@/lib/modules';
import { ROLE_OPTIONS, type UserRole } from '@/lib/types';
import styles from './Workspace.module.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { allRecords } from '@/lib/domain-api';
import { errorMessage } from '@/lib/api';
import { displayValue, type DomainRecord } from '@/lib/modules';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import { ModuleIcon } from './ModuleIcon';

const summaryKeys: Record<UserRole, string[]> = {
  doorman: ['packages', 'visitors', 'announcements'],
  provider: ['tickets', 'evidences', 'announcements'],
  resident: ['tickets', 'reservations', 'announcements', 'packages'],
  manager: ['tickets', 'reservations', 'announcements', 'packages'],
};
const recentKeys: Record<UserRole, string> = {
  resident: 'announcements', doorman: 'packages', provider: 'tickets', manager: 'tickets',
};
const shortcutKeys: Record<UserRole, string[]> = {
  resident: ['tickets', 'packages', 'visitors', 'reservations', 'announcements'],
  manager: ['announcements', 'tickets', 'common-areas', 'providers'],
  doorman: ['visitors', 'packages', 'history'],
  provider: ['tickets', 'evidences', 'history'],
};

function summaryStats(role: UserRole, records: Record<string, DomainRecord[]> | null): [string, number | undefined][] {
  const tickets = records?.tickets ?? [];
  if (role === 'doorman') return [
    ['Visitantes', records?.visitors?.length],
    ['Encomendas pendentes', records?.packages?.filter((item) => item.status === 'pending').length],
    ['Comunicados', records?.announcements?.length],
  ];
  if (role === 'provider') return [
    ['Ativos', tickets.filter((item) => item.status !== 'resolved').length],
    ['Pendentes', tickets.filter((item) => item.status === 'provider_assigned').length],
    ['Resolvidos', tickets.filter((item) => item.status === 'resolved').length],
  ];
  return [
    ['Chamados ativos', tickets.filter((item) => item.status !== 'resolved').length],
    ['Reservas', records?.reservations?.length], ['Comunicados', records?.announcements?.length],
  ];
}

function recentBadge(item: DomainRecord, module: string) {
  if (item.urgent) return 'Urgente';
  if (module === 'announcements') return displayValue(item.createdAt, 'createdAt');
  return displayValue(item.status);
}

export function DashboardHome() {
  const { user } = useSession();
  const label = ROLE_OPTIONS.find((item) => item.value === user.role)?.label;
  const [records, setRecords] = useState<Record<string, DomainRecord[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    const keys = summaryKeys[user.role];
    try {
      const sources = visibleModules(user.role).filter((item) => keys.includes(item.key));
      const entries = await Promise.all(sources.map(async (item) => [item.key, await allRecords(item.path)] as const));
      if (current === requestId.current) { setRecords(Object.fromEntries(entries)); setError(null); }
    } catch (err) { if (current === requestId.current) setError(errorMessage(err)); }
  }, [user.role]);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  useAutoRefresh(load);
  const stats = summaryStats(user.role, records);
  const recentKey = recentKeys[user.role];
  const recent = records?.[recentKey]?.slice(0, 3);
  const primaryKeys = shortcutKeys[user.role];
  const primary = primaryKeys.map((key) => visibleModules(user.role).find((item) => item.key === key))
    .filter((item) => item !== undefined);
  const others = visibleModules(user.role).filter((item) => !primaryKeys.includes(item.key));
  return <>
    <h1>Área do {label}</h1>
    <p className={styles.muted}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    {error && <div role="alert" className={styles.error}>{error}
      <button className={styles.textButton} onClick={() => void load()}>Tentar novamente</button></div>}
    <section className={styles.stats} aria-label="Resumo do condomínio">{stats.map(([title, count]) => <div className={styles.stat} key={title}>
      <span>{title}</span><strong>{records ? count ?? 0 : '—'}</strong>
    </div>)}</section>
    <h2 className={styles.sectionTitle}>Ações rápidas</h2>
    <div className={user.role === 'resident' ? styles.shortcutGrid : styles.moduleGrid}>
      {primary.map((item) => <Link key={item.key}
        className={user.role === 'resident' ? styles.shortcut : `${styles.card} ${styles.moduleLink}`} href={`/dashboard/${item.key}`}>
        <span className={styles.iconCircle}><ModuleIcon name={item.key} /></span>
        <h2>{item.title}</h2>{user.role !== 'resident' && <p className={styles.muted}>{item.description}</p>}
      </Link>)}
    </div>
    <h2 className={styles.sectionTitle}>{user.role === 'resident' ? 'Comunicados recentes' : 'Últimas ocorrências'}</h2>
    {!records && !error && <output className={styles.muted}>Carregando resumo...</output>}
    {recent?.length === 0 && <p className={styles.card}>Nenhuma ocorrência recente.</p>}
    {recent?.map((item) => <Link key={item.id} className={`${styles.card} ${styles.feedLink}`} href={`/dashboard/${recentKey}`}>
      <span className={styles.badge}>{recentBadge(item, recentKey)}</span>
      <h3>{displayValue(item.title ?? item.category ?? item.description)}</h3>
      <p className={styles.muted}>{displayValue(item.message ?? item.description)}</p>
    </Link>)}
    <h2 className={styles.sectionTitle}>Outros serviços</h2>
    <div className={styles.moduleGrid}>
      {user.role === 'manager' && <Link className={`${styles.card} ${styles.moduleLink}`} href="/dashboard/users">
        <span className={styles.iconCircle}><ModuleIcon name="users" /></span>
        <h2>Usuários</h2><p className={styles.muted}>Gerencie contas, perfis e códigos de cadastro.</p>
      </Link>}
      {others.map((item) => <Link key={item.key} className={`${styles.card} ${styles.moduleLink}`} href={`/dashboard/${item.key}`}>
        <span className={styles.iconCircle}><ModuleIcon name={item.key} /></span>
        <h2>{item.title}</h2><p className={styles.muted}>{item.description}</p>
      </Link>)}
    </div>
  </>;
}
