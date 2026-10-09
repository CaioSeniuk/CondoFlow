'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { errorMessage, registerUser } from '@/lib/api';
import type { UserInput } from '@/lib/types';
import { UserFields } from './UserFields';
import styles from './Workspace.module.css';
import formStyles from './RegisterForm.module.css';

export function RegisterForm() {
  const [input, setInput] = useState<UserInput>({
    username: '', firstName: '', lastName: '', email: '',
    role: 'resident', block: '', apartment: '', phone: '',
  });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [condominiumCode, setCondominiumCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    if (input.role === 'manager') {
      setError('Contas de síndico devem ser provisionadas pelo administrador.');
      return;
    }
    setBusy(true);
    try {
      await registerUser({
        ...input, role: input.role, username: input.username.trim(), email: input.email.trim(),
        password, condominiumCode: condominiumCode.trim(),
      });
      setPassword('');
      setConfirmation('');
      setCreated(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <div className={formStyles.container}>
    <Link className={formStyles.back} href="/login">← Voltar para entrar</Link>
    <h1>Criar conta</h1>
    {created ? <>
      <p className={styles.success} role="status">Conta criada com sucesso! Entre com seu usuário e senha.</p>
      <p className={styles.muted}>Seu usuário: <strong>{input.username.trim()}</strong></p>
      <Link className={formStyles.submit} href="/login">Entrar na minha conta</Link>
    </> : <>
      <p className={styles.muted}>Solicite o código ao síndico. Sua conta ficará vinculada ao condomínio desse código.</p>
      <form onSubmit={submit} aria-busy={busy}>
        <label className={styles.field}>Código do condomínio *
          <input required value={condominiumCode} onChange={(e) => setCondominiumCode(e.target.value)}
            disabled={busy} minLength={32} maxLength={32} pattern="[a-fA-F0-9]{32}"
            autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </label>
        <UserFields input={input} onChange={setInput} password={password}
          onPasswordChange={setPassword} disabled={busy} publicRegistration />
        <label className={styles.field}>Confirmar senha *
          <input type="password" required minLength={8} autoComplete="new-password"
            value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={busy}
            aria-invalid={!!error && password !== confirmation}
            aria-describedby={error ? 'register-error' : undefined} />
        </label>
        {error && <p id="register-error" className={styles.error} role="alert">{error}</p>}
        <button className={formStyles.submit} type="submit" disabled={busy}>
          {busy ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p className={formStyles.login}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </>}
  </div>;
}
