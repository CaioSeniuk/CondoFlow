'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listRecords } from '@/lib/domain-api';
import { errorMessage } from '@/lib/api';
import { displayValue, visibleModules } from '@/lib/modules';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import { useSession } from './SessionProvider';
import { ModuleIcon } from './ModuleIcon';
import styles from './Workspace.module.css';

interface Activity {
  key: string;
  title: string;
  module: string;
  moduleTitle: string;
  date: string | null;
  status: string;
}

export function ActivityPage({ history = false }: { history?: boolean }) {
  const { user } = useSession();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const key = `condoflow-read-activities:${user.condominiumId}:${user.id}`;
  const requestId = useRef(0);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (!Array.isArray(stored) || !stored.every((value: unknown) => typeof value === 'string')) {
        throw new Error('Formato de leitura inválido.');
      }
      setRead(stored);
      setReadError(null);
    } catch { setReadError('Não foi possível recuperar as atividades marcadas como lidas neste navegador.'); }
  }, [key]);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const resources = visibleModules(user.role).filter((module) =>
        ['announcements', 'packages', 'tickets', 'reservations', 'access-logs', 'evidences'].includes(module.key));
      const sources = await Promise.all(resources.map(async (module) => {
        const result = await listRecords(module.path);
        return result.results.map((record): Activity => {
          const date = record.updatedAt ?? record.registeredAt ?? record.createdAt ?? null;
          return {
            key: `${module.key}:${record.id}:${String(date)}:${String(record.status ?? '')}`,
            title: `${displayValue(record[module.titleKey])} · #${record.id}`,
            module: module.key, moduleTitle: module.title,
            date: typeof date === 'string' ? date : null,
            status: displayValue(record.status ?? record.direction),
          };
        });
      }));
      if (current !== requestId.current) return;
      setItems(sources.flat().sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0)));
      setError(null);
    } catch (err) { if (current === requestId.current) setError(errorMessage(err)); }
  }, [user.role]);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  useAutoRefresh(load);

  function markRead(activityKey: string) {
    const next = [...new Set([...read, activityKey])];
    try { localStorage.setItem(key, JSON.stringify(next)); setRead(next); setReadError(null); }
    catch { setReadError('Não foi possível salvar a confirmação de leitura neste navegador.'); }
  }

  const filtered = items?.filter((item) => !unreadOnly || !read.includes(item.key));
  return <>
    <h1>{history ? 'Histórico geral' : 'Notificações'}</h1>
    <p className={styles.muted}>Atividades recentes dos módulos acessíveis ao seu perfil. Não são notificações push.
      {history ? '' : ' A marcação de leitura fica salva neste navegador.'}</p>
    <div className={styles.filters}>
      <button className={!unreadOnly ? styles.filterActive : styles.filter} onClick={() => setUnreadOnly(false)}>Todas</button>
      {!history && <button className={unreadOnly ? styles.filterActive : styles.filter} onClick={() => setUnreadOnly(true)}>Não lidas</button>}
      <button className={styles.filter} onClick={() => void load()}>Atualizar</button>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {readError && <p role="alert" className={styles.error}>{readError}</p>}
    {!items && !error && <p role="status">Carregando atividades...</p>}
    {filtered?.length === 0 && <p className={styles.card}>Nenhuma atividade encontrada.</p>}
    {filtered?.map((item) => <article key={item.key} className={styles.card}>
      <div className={styles.toolbar}><span className={styles.iconCircle}><ModuleIcon name={item.module} /></span>
        <span className={styles.badge}>{item.moduleTitle}</span></div>
      <h2>{item.title}</h2>
      <p className={styles.muted}>{item.date ? displayValue(item.date, 'createdAt') : 'Data não informada'} · {item.status}</p>
      <div className={styles.actions}>
        <Link href={`/dashboard/${item.module}`} className={styles.secondary}>Ver registro</Link>
        {!history && <button className={styles.secondary} disabled={read.includes(item.key)} onClick={() => markRead(item.key)}>
          {read.includes(item.key) ? 'Lida' : 'Marcar como lida'}</button>}
      </div>
    </article>)}
  </>;
}
