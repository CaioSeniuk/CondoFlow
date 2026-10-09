'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '@/lib/api';
import type { AdminCondominium, PaginatedResult, ProvisionCondominiumInput } from '@/lib/types';
import styles from '@/components/Workspace.module.css';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

const empty: ProvisionCondominiumInput = {
  name: '',
};

export default function AdminPage() {
  const [input, setInput] = useState(empty);
  const [data, setData] = useState<PaginatedResult<AdminCondominium> | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    item: AdminCondominium; mode: 'generate' | 'revoke' | 'delete';
  } | null>(null);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setError(null);
    try {
      const latest = await adminApi.list(page);
      if (current !== requestId.current) return;
      setData(latest);
      setResult((current) => current && latest.results.some((item) =>
        item.name === current.name && item.registrationCode !== current.code) ? null : current);
    }
    catch (err) { if (current === requestId.current) setError(errorMessage(err)); }
  }, [page]);
  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);
  useAutoRefresh(load, !busy && !confirmation);

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null); setResult(null);
    try {
      const created = await adminApi.provision({ name: input.name.trim() });
      setResult(created);
      setNotice('Condomínio criado e código gerado. O código é reutilizável e não expira.');
      setInput(empty);
      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function change(item: AdminCondominium, revoke: boolean) {
    setBusy(true); setError(null); setNotice(null); setResult(null);
    try {
      if (revoke) {
        await adminApi.revokeCode(item.id);
        setNotice(`Código de ${item.name} revogado.`);
      } else {
        setResult(await adminApi.replaceCode(item.id));
        setNotice('Novo código gerado. Compartilhe com o síndico desse condomínio.');
      }

      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function remove(item: AdminCondominium) {
    setBusy(true); setError(null); setNotice(null); setResult(null);
    try {
      await adminApi.remove(item.id);
      setNotice(`Condomínio ${item.name} excluído.`);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <>
    <h1>Administração de condomínios</h1>
    <p className={styles.muted}>Cadastre condomínios e gere códigos de cadastro reutilizáveis, sem prazo de validade.</p>
    <p className={styles.muted}>Só é possível excluir condomínios sem usuários ou outros registros vinculados.</p>
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {result && <section className={styles.card}>
      <h2>Código de {result.name}</h2>
      <label className={styles.field}>Código gerado
        <input readOnly value={result.code} onFocus={(event) => event.target.select()} />
      </label>
      <p className={styles.muted}>O código continuará disponível neste painel e válido até ser substituído ou revogado.</p>
    </section>}
    <section className={styles.card}>
      <h2>Novo condomínio</h2>
      <form onSubmit={provision}>
        <fieldset disabled={busy} className={styles.fieldset}>
          <div className={styles.fields}>
            <label className={styles.field}>Nome do condomínio
              <input value={input.name} required minLength={1} maxLength={150}
                onChange={(event) => setInput({ name: event.target.value })} />
            </label>
          </div>
          <button className={styles.primary}>Criar condomínio e gerar código</button>
        </fieldset>
      </form>
    </section>
    {!data && !error && <p role="status">Carregando condomínios...</p>}
    {data?.results.map((item) => <article key={item.id} className={styles.card}>
      <h2>{item.name}</h2>
      {item.registrationCode ? <label className={styles.field}>Código de cadastro de {item.name}
        <input readOnly value={item.registrationCode} onFocus={(event) => event.target.select()} />
      </label> : <p className={styles.muted}>{item.codeUpdatedAt
        ? 'Código indisponível para exibição ou revogado. Códigos antigos armazenados apenas como hash não podem ser recuperados; gere outro para exibi-lo aqui.'
        : 'Nenhum código gerado.'}</p>}
      <p className={styles.muted}>Códigos gerados não expiram. Gerar outro substitui o anterior.</p>
      <div className={styles.actions}>
        <button className={styles.secondary} disabled={busy} onClick={() => setConfirmation({ item, mode: 'generate' })}>Gerar código para {item.name}</button>
        <button className={styles.danger} disabled={busy} onClick={() => setConfirmation({ item, mode: 'revoke' })}>Revogar código de {item.name}</button>
        <button className={styles.danger} disabled={busy} onClick={() => setConfirmation({ item, mode: 'delete' })}>Excluir condomínio {item.name}</button>
      </div>
    </article>)}
    {data && <div className={styles.pagination}>
      <button className={styles.secondary} disabled={busy || !data.previous} onClick={() => { if (data.previous) setPage(data.previous); }}>Anterior</button>
      <span>Página {page}</span>
      <button className={styles.secondary} disabled={busy || !data.next} onClick={() => { if (data.next) setPage(data.next); }}>Próxima</button>
    </div>}
    {error && <button className={styles.secondary} disabled={busy} onClick={() => void load()}>Tentar novamente</button>}
    {confirmation && <ConfirmationDialog
      title={{ generate: 'Gerar novo código', revoke: 'Revogar código', delete: 'Excluir condomínio' }[confirmation.mode]}
      message={confirmation.mode === 'delete'
        ? `Excluir definitivamente o condomínio ${confirmation.item.name}? Seu código deixará de funcionar. Esta ação não pode ser desfeita.`
        : `${confirmation.mode === 'revoke' ? 'Revogar' : 'Substituir'} o código de ${confirmation.item.name}? O código anterior deixará de funcionar.`}
      confirmLabel={{ generate: 'Confirmar geração', revoke: 'Confirmar revogação', delete: 'Confirmar exclusão' }[confirmation.mode]}
      busy={busy} onClose={() => setConfirmation(null)}
      onConfirm={() => {
        const action = confirmation.mode === 'delete'
          ? remove(confirmation.item) : change(confirmation.item, confirmation.mode === 'revoke');
        void action.finally(() => setConfirmation(null));
      }} />}
  </>;
}
