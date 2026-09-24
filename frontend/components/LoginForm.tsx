'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, fetchCurrentUser, login } from '@/lib/api';
import { dashboardPathForRole, saveTokens } from '@/lib/auth';
import { ROLE_OPTIONS, type UserRole } from '@/lib/types';
import { RoleSelector } from './RoleSelector';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('resident');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Preencha e-mail e senha para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const tokens = await login(identifier.trim(), password);
      const me = await fetchCurrentUser(tokens.access);

      if (me.role !== role) {
        const expected = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
        setError(`Esta conta não é de ${expected}. Selecione o perfil correto e tente novamente.`);
        setSubmitting(false);
        return;
      }

      saveTokens(tokens);
      router.push(dashboardPathForRole(me.role));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível conectar ao servidor. Tente novamente.');
      }
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Entrar</h1>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="identifier">
          E-mail
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="seuemail@exemplo.com"
          className={styles.input}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <RoleSelector value={role} onChange={setRole} disabled={submitting} />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
