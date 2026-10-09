'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { condominiumApi, errorMessage } from '@/lib/api';
import type { CondominiumInfo } from '@/lib/types';
import styles from './Workspace.module.css';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useAutoRefresh } from '@/lib/useAutoRefresh';

export function CondominiumCodePanel() {
  const [info, setInfo] = useState<CondominiumInfo | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'generate' | 'revoke' | null>(null);
  const generatedAt = useRef<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const latest = await condominiumApi.me();
      if (latest.codeUpdatedAt !== generatedAt.current) setCode(null);
      setInfo(latest);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load, !busy && !confirmation);

  async function change(revoke: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (revoke) {
        setInfo(await condominiumApi.revokeCode());
        setCode(null);
        setNotice('Código revogado. Novos cadastros estão bloqueados.');
      } else {
        const result = await condominiumApi.replaceCode();
        generatedAt.current = result.codeUpdatedAt;
        setInfo(result);
        setCode(result.code);
        setNotice('Novo código gerado. O código anterior foi invalidado.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  }

  return <section className={styles.card} aria-label="Código de cadastro do condomínio">
    <h2>Código do condomínio</h2>
    {info && <p className={styles.muted}>{info.name} · {info.codeEnabled ? 'Código ativo' : 'Cadastros públicos bloqueados'}</p>}
    <p className={styles.muted}>Compartilhe apenas com moradores, porteiros e prestadores autorizados.
      O código vincula novas contas ao seu condomínio, sem permitir cadastro público de síndicos.</p>
    {code && <>
      <label className={styles.field}>Código gerado
        <input readOnly value={code} onFocus={(event) => event.target.select()} />
      </label>
      <p className={styles.muted}>Guarde este código agora. Ele não será exibido novamente ao sair desta tela.</p>
    </>}
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {busy && <p className={styles.muted} role="status">Carregando código...</p>}
    <div className={styles.actions}>
      <button className={styles.secondary} disabled={busy || !info} onClick={() => setConfirmation('generate')}>Gerar novo código</button>
      <button className={styles.danger} disabled={busy || !info?.codeEnabled} onClick={() => setConfirmation('revoke')}>Revogar código</button>
      {error && <button className={styles.secondary} disabled={busy} onClick={() => void load()}>Recarregar condomínio</button>}
    </div>
    {confirmation && <ConfirmationDialog
      title={confirmation === 'revoke' ? 'Revogar código' : 'Gerar novo código'}
      message={confirmation === 'revoke'
        ? 'Revogar o código e bloquear novos cadastros? As contas existentes continuarão ativas.'
        : 'Gerar um novo código? O código anterior deixará de funcionar imediatamente.'}
      confirmLabel={confirmation === 'revoke' ? 'Confirmar revogação' : 'Confirmar geração'}
      busy={busy} onClose={() => setConfirmation(null)}
      onConfirm={() => void change(confirmation === 'revoke')} />}
  </section>;
}
