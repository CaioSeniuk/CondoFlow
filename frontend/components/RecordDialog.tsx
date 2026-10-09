'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/api';
import { allRecords, saveRecord } from '@/lib/domain-api';
import { type DomainRecord, type FieldDefinition } from '@/lib/modules';
import { useSession } from './SessionProvider';
import styles from './Workspace.module.css';

export interface RecordAction {
  title: string;
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  fields: FieldDefinition[];
  record?: DomainRecord;
  multipart?: boolean;
  message?: string;
  success: string;
}

function initialValue(field: FieldDefinition, record?: DomainRecord): string {
  const value = record?.[field.source ?? field.key];
  if (typeof value !== 'string' && typeof value !== 'number') return field.defaultValue ?? '';
  if (field.type === 'datetime-local') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return field.type === 'date' ? String(value).slice(0, 10) : String(value);
}

export function RecordDialog({ action, onClose, onSaved }: {
  action: RecordAction;
  onClose: () => void;
  onSaved: (message: string, result: Record<string, unknown>) => void;
}) {
  const { user } = useSession();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, DomainRecord[]>>({});
  const missingAddress = user.role === 'resident' && action.fields.some((field) => field.key === 'block')
    && (!user.block || !user.apartment);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const sources = await Promise.all(action.fields.filter((field) => field.reference).map(async (field) => {
          const source = field.reference!;
          const records = await allRecords(source.path);
          return [field.key, source.role ? records.filter((record) => record.role === source.role) : records] as const;
        }));
        if (active) setChoices(Object.fromEntries(sources));
      } catch (err) {
        if (active) { setError(errorMessage(err)); setLookupFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [action]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    const upload = new FormData();
    setError(null);
    try {
      if (missingAddress) throw new Error('Peça ao síndico para configurar o bloco e o apartamento da sua conta antes de autorizar visitantes.');
      for (const field of action.fields) {
        const entry = form.get(field.key);
        const text = typeof entry === 'string' ? entry.trim() : '';
        if (!text && field.omitEmpty) continue;
        if (field.type === 'file') {
          if (entry instanceof File && entry.size > 0) {
            if (entry.size > 10 * 1024 * 1024) throw new Error('Cada arquivo deve ter no máximo 10 MB.');
            upload.set(field.key, entry);
          }
          continue;
        }
        if (field.required && !text) throw new Error(`Preencha ${field.label}.`);
        if (field.type === 'checkbox') payload[field.key] = entry !== null;
        else if (field.type === 'options') {
          const options = text.split('\n').map((line) => line.trim()).filter(Boolean);
          if (options.length < 2 || options.some((option) => option.length > 150)) {
            throw new Error('Informe pelo menos duas opções, com até 150 caracteres cada.');
          }
          payload[field.key] = options.map((option) => ({ text: option }));
        } else if (field.reference || field.type === 'number') {
          if (!text && !field.required) continue;
          const number = Number(text);
          if (!Number.isFinite(number) || (field.reference && !Number.isSafeInteger(number))) {
            throw new Error(`Valor inválido para ${field.label}.`);
          }
          payload[field.key] = number;
        } else if (field.type === 'datetime-local') {
          payload[field.key] = text ? new Date(text).toISOString() : null;
        } else payload[field.key] = text;
      }
      for (const [from, until] of [['validFrom', 'validUntil'], ['startTime', 'endTime'], ['startDate', 'endDate']]) {
        const start = payload[from];
        const end = payload[until];
        if (typeof start === 'string' && typeof end === 'string' && new Date(start) >= new Date(end)) {
          throw new Error('O fim do período deve ser posterior ao início.');
        }
      }
      if (payload.segment === 'block' && !payload.block) throw new Error('Informe o bloco destinatário.');
      if (payload.segment === 'apartment' && (!payload.block || !payload.apartment)) {
        throw new Error('Informe o bloco e o apartamento destinatários.');
      }
      if (action.multipart) {
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null) upload.set(key, String(value));
        }
      }
      setBusy(true);
      const result = await saveRecord(action.path, action.method, action.method === 'DELETE'
        ? undefined : action.multipart ? upload : payload);
      onSaved(action.success, result);
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.toolbar}>
      <h2 id={titleId}>{action.title}</h2>
      <button className={styles.textButton} disabled={busy} onClick={onClose}>Fechar</button>
    </div>
    <form onSubmit={submit} aria-busy={busy}>
      {action.message && <p className={styles.muted}>{action.message}</p>}
      {action.fields.some((field) => field.key === 'status') && action.path.includes('/tickets/') &&
        <p className={styles.muted}>Ao marcar como resolvido, o chamado é encerrado e não poderá mudar de status novamente.</p>}
      {loading && <p role="status">Carregando opções...</p>}
      {missingAddress && <p className={styles.error} role="alert">
        Peça ao síndico para configurar o bloco e o apartamento da sua conta antes de autorizar visitantes.
      </p>}
      <fieldset disabled={busy || loading || lookupFailed} className={styles.fieldset}>
        <div className={styles.fields}>
          {!loading && action.fields.map((field) => {
            const locked = user.role === 'resident' && (field.key === 'block' || field.key === 'apartment');
            const value = locked ? user[field.key === 'block' ? 'block' : 'apartment'] : initialValue(field, action.record);
            const fieldId = `${titleId}-${field.key}`;
            return <div key={field.key} className={`${styles.field} ${field.type === 'textarea' || field.type === 'options' ? styles.wide : ''}`}>
              <label htmlFor={fieldId}>{field.label}{field.required && ' *'}</label>
              {field.type === 'textarea' || field.type === 'options'
                ? <textarea id={fieldId} name={field.key} rows={4} required={field.required} maxLength={field.maxLength} defaultValue={value} />
                : field.type === 'select'
                  ? <select id={fieldId} name={field.key} required={field.required} defaultValue={value}>
                    <option value="">Selecione</option>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    {choices[field.key]?.map((record) => <option key={record.id} value={record.id}>
                      {String(record[field.reference?.labelKey ?? 'name'] ?? record.id)} · #{record.id}
                    </option>)}
                  </select>
                  : field.type === 'checkbox'
                    ? <input id={fieldId} type="checkbox" name={field.key} defaultChecked={action.record?.[field.key] === true} />
                    : <input id={fieldId} type={field.type ?? 'text'} name={field.key} required={field.required}
                      maxLength={field.maxLength} accept={field.accept} readOnly={locked}
                      step={field.type === 'number' ? '0.01' : undefined}
                      {...(field.type === 'file' ? {} : { defaultValue: value })} />}
            </div>;
          })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
          <button className={action.method === 'DELETE' ? styles.danger : styles.primary} type="submit" disabled={busy || loading || missingAddress}>
            {busy ? 'Salvando...' : action.method === 'DELETE' ? 'Confirmar exclusão' : 'Salvar'}
          </button>
        </div>
      </fieldset>
      {lookupFailed && <button type="button" className={styles.secondary} onClick={onClose}>Fechar e tentar novamente</button>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  </dialog>;
}
