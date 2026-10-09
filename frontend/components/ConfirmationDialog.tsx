'use client';

import { useEffect, useId, useRef } from 'react';
import styles from './Workspace.module.css';

export function ConfirmationDialog({ title, message, confirmLabel, busy, onClose, onConfirm }: {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
    aria-describedby={messageId} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={titleId}>{title}</h2>
    <p id={messageId} className={styles.muted}>{message}</p>
    <div className={styles.actions}>
      <button type="button" autoFocus className={styles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="button" className={styles.danger} disabled={busy} onClick={onConfirm}>
        {busy ? 'Processando...' : confirmLabel}
      </button>
    </div>
  </dialog>;
}
