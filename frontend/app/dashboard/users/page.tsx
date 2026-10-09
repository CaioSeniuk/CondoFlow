'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usersApi, errorMessage } from '@/lib/api';
import { ROLE_OPTIONS, type PaginatedResult, type AuthenticatedUser } from '@/lib/types';
import { useSession } from '@/components/SessionProvider';
import { UserDialog, type UserDialogAction } from '@/components/UserDialog';
import { CondominiumCodePanel } from '@/components/CondominiumCodePanel';
import styles from '@/components/Workspace.module.css';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

export default function UsersPage() {
  const { user, reloadUser } = useSession();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResult<AuthenticatedUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [action, setAction] = useState<UserDialogAction | null>(null);
  const [opening, setOpening] = useState(false);
  const request = useRef(0);

  const load = useCallback(async (showLoading = true) => {
    const current = ++request.current;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await usersApi.list(page);
      if (current !== request.current) return;
      if (!result.results.length && page > 1) {
        setPage(result.previous ?? 1);
      } else {
        setData(result);
      }
    } catch (err) {
      if (current === request.current) setError(errorMessage(err));
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
    return () => { request.current++; };
  }, [load]);
  useAutoRefresh(() => load(false), !action && !opening);

  async function open(mode: 'details' | 'edit' | 'delete', id: string) {
    setOpening(true);
    setError(null);
    setSuccess(null);
    try {
      setAction({ mode, user: await usersApi.get(id) });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setOpening(false);
    }
  }

  function saved(message: string, id?: string) {
    setAction(null);
    setSuccess(message);
    if (id === user.id) {
      void reloadUser().catch((err: unknown) => setError(errorMessage(err)));
    }
    void load();
  }

  return <>
    <div className={styles.toolbar}>
      <div><h1>Usuários</h1><p className={styles.muted}>Gerencie as contas e os perfis do condomínio.</p></div>
      <button className={styles.primary} disabled={opening} onClick={() => {
        setSuccess(null); setAction({ mode: 'create' });
      }}>+ Novo usuário</button>
    </div>
    <CondominiumCodePanel />
    {success && <p className={styles.success} role="status">{success}</p>}
    {error && <div className={styles.error} role="alert">
      <p>{error}</p><button className={styles.secondary} onClick={() => void load()}>Tentar novamente</button>
    </div>}
    {loading ? <p className={styles.muted} role="status">Carregando usuários...</p> : !error && data && <>
      <p className={styles.muted}>{data.count} usuário(s) cadastrado(s)</p>
      {!data.results.length && <div className={styles.card}>Nenhum usuário cadastrado.</div>}
      {data.results.map((item) => <article key={item.id} className={styles.card}>
        <div className={styles.userHeading}>
          <div><h2>{[item.firstName, item.lastName].filter(Boolean).join(' ') || item.username}</h2>
            <p className={styles.muted}>@{item.username}{item.id === user.id && ' · Sua conta'}</p></div>
          <span className={styles.badge}>{ROLE_OPTIONS.find((role) => role.value === item.role)?.label}</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondary} disabled={opening} onClick={() => void open('details', item.id)}
            aria-label={`Ver dados de ${item.username}`}>Ver dados</button>
          <button className={styles.secondary} disabled={opening} onClick={() => void open('edit', item.id)}
            aria-label={`Editar ${item.username}`}>Editar</button>
          <button className={styles.danger} disabled={opening} onClick={() => void open('delete', item.id)}
            aria-label={`Excluir ${item.username}`}>Excluir</button>
        </div>
      </article>)}
      <div className={styles.pagination} aria-label="Paginação">
        <button className={styles.secondary} disabled={!data.previous || opening}
          onClick={() => { if (data.previous) setPage(data.previous); }}>Anterior</button>
        <span>Página {page}</span>
        <button className={styles.secondary} disabled={!data.next || opening}
          onClick={() => { if (data.next) setPage(data.next); }}>Próxima</button>
      </div>
    </>}
    {opening && <p className={styles.muted} role="status">Carregando dados do usuário...</p>}
    {action && <UserDialog action={action} onClose={() => setAction(null)} onSaved={saved} />}
  </>;
}
