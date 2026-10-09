'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { usersApi, errorMessage } from '@/lib/api';
import { type AuthenticatedUser, type UserInput } from '@/lib/types';
import { UserDetails } from './UserDetails';
import { UserFields } from './UserFields';
import styles from './Workspace.module.css';

export type UserDialogAction =
  | { mode: 'create' }
  | { mode: 'edit' | 'details' | 'delete'; user: AuthenticatedUser };

function Modal({ title, children, onClose, busy }: {
  title: string; children: ReactNode; onClose: () => void; busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.toolbar}>
      <h2 id="dialog-title">{title}</h2>
      <button type="button" className={styles.textButton} onClick={onClose} disabled={busy}
        aria-label="Fechar janela">Fechar</button>
    </div>
    {children}
  </dialog>;
}

export function UserDialog({ action, onClose, onSaved }: {
  action: UserDialogAction;
  onClose: () => void;
  onSaved: (message: string, userId?: string) => void;
}) {
  const original = action.mode === 'create' ? null : action.user;
  const [input, setInput] = useState<UserInput>({
    username: original?.username ?? '', firstName: original?.firstName ?? '',
    lastName: original?.lastName ?? '', email: original?.email ?? '',
    role: original?.role ?? 'resident', block: original?.block ?? '',
    apartment: original?.apartment ?? '', phone: original?.phone ?? '',
  });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = action.mode === 'create';
  const title = { create: 'Novo usuário', edit: 'Editar usuário', details: 'Dados do usuário', delete: 'Excluir usuário' }[action.mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (action.mode === 'delete') {
        await usersApi.remove(action.user.id);
        onSaved('Usuário excluído.', action.user.id);
      } else if (action.mode === 'create') {
        await usersApi.create({ ...input, username: input.username.trim(), password });
        onSaved('Usuário cadastrado.');
      } else if (action.mode === 'edit') {
        await usersApi.update(action.user.id, { ...input, username: input.username.trim() });
        onSaved('Usuário atualizado.', action.user.id);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={title} onClose={onClose} busy={busy}>
    {action.mode === 'details' ? <UserDetails user={action.user} /> : (
      <form onSubmit={submit} aria-busy={busy}>
        {action.mode === 'delete' ? (
          <p className={styles.muted}>Excluir a conta de <strong>{action.user.username}</strong>?
            Esta ação não pode ser desfeita e pode remover registros vinculados a este usuário.</p>
        ) : (
          <UserFields input={input} onChange={setInput} disabled={busy}
            password={creating ? password : undefined} onPasswordChange={creating ? setPassword : undefined} />
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className={action.mode === 'delete' ? styles.danger : styles.primary} disabled={busy}>
            {busy ? 'Salvando...' : action.mode === 'delete' ? 'Excluir usuário' : 'Salvar usuário'}
          </button>
        </div>
      </form>
    )}
  </Modal>;
}
