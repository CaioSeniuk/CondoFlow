'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/api';
import { allRecords, saveRecord } from '@/lib/domain-api';
import { type DomainRecord, type FieldDefinition } from '@/lib/modules';
import type { AuthenticatedUser } from '@/lib/types';
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

const addressMessage = 'Peça ao síndico para configurar o bloco e o apartamento da sua conta antes de autorizar visitantes.';

function fieldNumber(field: FieldDefinition, text: string): number {
  const number = Number(text);
  if (!Number.isFinite(number) || (field.reference && !Number.isSafeInteger(number))) {
    throw new Error(`Valor inválido para ${field.label}.`);
  }
  return number;
}

function fieldOptions(text: string): { text: string }[] {
  const options = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (options.length < 2 || options.some((option) => option.length > 150)) {
    throw new Error('Informe pelo menos duas opções, com até 150 caracteres cada.');
  }
  return options.map((option) => ({ text: option }));
}

function uploadField(upload: FormData, field: FieldDefinition, entry: FormDataEntryValue | null) {
  if (!(entry instanceof File) || entry.size === 0) return;
  if (entry.size > 10 * 1024 * 1024) throw new Error('Cada arquivo deve ter no máximo 10 MB.');
  upload.set(field.key, entry);
}

function textValue(field: FieldDefinition, text: string): string | null {
  if (field.type !== 'datetime-local') return text;
  return text ? new Date(text).toISOString() : null;
}

function payloadField(payload: Record<string, unknown>, field: FieldDefinition, entry: FormDataEntryValue | null) {
  const text = typeof entry === 'string' ? entry.trim() : '';
  if (!text && field.omitEmpty) return;
  if (field.required && !text) throw new Error(`Preencha ${field.label}.`);
  if (field.type === 'checkbox') {
    payload[field.key] = entry !== null;
    return;
  }
  if (field.type === 'options') {
    payload[field.key] = fieldOptions(text);
    return;
  }
  if (field.reference || field.type === 'number') {
    if (text || field.required) payload[field.key] = fieldNumber(field, text);
    return;
  }
  payload[field.key] = textValue(field, text);
}

function validatePayload(payload: Record<string, unknown>) {
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
}

function requestBody(action: RecordAction, form: FormData) {
  const payload: Record<string, unknown> = {};
  const upload = new FormData();
  for (const field of action.fields) {
    const entry = form.get(field.key);
    if (field.type === 'file') uploadField(upload, field, entry);
    else payloadField(payload, field, entry);
  }
  validatePayload(payload);
  if (action.method === 'DELETE') return undefined;
  if (!action.multipart) return payload;
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null) upload.set(key, String(value));
  }
  return upload;
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

type FieldProps = Readonly<{
  field: FieldDefinition;
  fieldId: string;
  value: string;
  locked: boolean;
  record?: DomainRecord;
  choices: DomainRecord[];
}>;

function FieldControl({ field, fieldId, value, locked, record, choices }: FieldProps) {
  if (field.type === 'textarea' || field.type === 'options') {
    return <textarea id={fieldId} name={field.key} rows={4} required={field.required} maxLength={field.maxLength} defaultValue={value} />;
  }
  if (field.type === 'select') {
    return <select id={fieldId} name={field.key} required={field.required} defaultValue={value}>
      <option value="">Selecione</option>
      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      {choices.map((choice) => <option key={choice.id} value={choice.id}>
        {String(choice[field.reference?.labelKey ?? 'name'] ?? choice.id)} · #{choice.id}
      </option>)}
    </select>;
  }
  if (field.type === 'checkbox') {
    return <input id={fieldId} type="checkbox" name={field.key} defaultChecked={record?.[field.key] === true} />;
  }
  return <input id={fieldId} type={field.type ?? 'text'} name={field.key} required={field.required}
    maxLength={field.maxLength} accept={field.accept} readOnly={locked}
    step={field.type === 'number' ? '0.01' : undefined}
    {...(field.type === 'file' ? {} : { defaultValue: value })} />;
}

function RecordFields({ action, user, titleId, choices }: Readonly<{
  action: RecordAction; user: AuthenticatedUser; titleId: string; choices: Record<string, DomainRecord[]>;
}>) {
  return <>{action.fields.map((field) => {
    const locked = user.role === 'resident' && (field.key === 'block' || field.key === 'apartment');
    const value = locked ? user[field.key === 'block' ? 'block' : 'apartment'] : initialValue(field, action.record);
    const fieldId = `${titleId}-${field.key}`;
    const wide = field.type === 'textarea' || field.type === 'options';
    return <div key={field.key} className={`${styles.field} ${wide ? styles.wide : ''}`}>
      <label htmlFor={fieldId}>{field.label}{field.required && ' *'}</label>
      <FieldControl field={field} fieldId={fieldId} value={value} locked={locked}
        record={action.record} choices={choices[field.key] ?? []} />
    </div>;
  })}</>;
}

function submitLabel(busy: boolean, method: RecordAction['method']) {
  if (busy) return 'Salvando...';
  return method === 'DELETE' ? 'Confirmar exclusão' : 'Salvar';
}

function RecordMessages({ action, loading, missingAddress }: Readonly<{
  action: RecordAction; loading: boolean; missingAddress: boolean;
}>) {
  const changingTicketStatus = action.path.includes('/tickets/') && action.fields.some((field) => field.key === 'status');
  return <>
    {action.message && <p className={styles.muted}>{action.message}</p>}
    {changingTicketStatus && <p className={styles.muted}>Ao marcar como resolvido, o chamado é encerrado e não poderá mudar de status novamente.</p>}
    {loading && <output>Carregando opções...</output>}
    {missingAddress && <p className={styles.error} role="alert">{addressMessage}</p>}
  </>;
}

export function RecordDialog({ action, onClose, onSaved }: Readonly<{
  action: RecordAction;
  onClose: () => void;
  onSaved: (message: string, result: Record<string, unknown>) => void;
}>) {
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
        const sources = await Promise.all(action.fields.map(async (field) => {
          const source = field.reference;
          if (!source) return [field.key, []] as const;
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
    setError(null);
    try {
      if (missingAddress) throw new Error(addressMessage);
      const body = requestBody(action, form);
      setBusy(true);
      const result = await saveRecord(action.path, action.method, body);
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
      <RecordMessages action={action} loading={loading} missingAddress={missingAddress} />
      <fieldset disabled={busy || loading || lookupFailed} className={styles.fieldset}>
        <div className={styles.fields}>
          {!loading && <RecordFields action={action} user={user} titleId={titleId} choices={choices} />}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
          <button className={action.method === 'DELETE' ? styles.danger : styles.primary} type="submit" disabled={busy || loading || missingAddress}>
            {submitLabel(busy, action.method)}
          </button>
        </div>
      </fieldset>
      {lookupFailed && <button type="button" className={styles.secondary} onClick={onClose}>Fechar e tentar novamente</button>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  </dialog>;
}
