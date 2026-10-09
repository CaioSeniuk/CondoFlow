'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { errorMessage, fetchCurrentUser, login, usersApi } from '@/lib/api';
import { dashboardPathForRole, getAccessToken, saveTokens } from '@/lib/auth';
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
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        if (getAccessToken()) {
          const me = await usersApi.me();
          if (active) router.replace(dashboardPathForRole(me.role, me.isSuperuser));
        }
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Preencha usuário e senha para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const tokens = await login(identifier.trim(), password);
      const me = await fetchCurrentUser(tokens.access);

      if (!me.isSuperuser && me.role !== role) {
        const expected = ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
        setError(`Esta conta não é de ${expected}. Selecione o perfil correto e tente novamente.`);
        return;
      }

      saveTokens(tokens);
      router.replace(dashboardPathForRole(me.role, me.isSuperuser));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>Entrar</h1>
      {checking && <p className={styles.label} role="status">Verificando sessão...</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="identifier">
          Usuário
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="Seu nome de usuário"
          className={styles.input}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          disabled={submitting || checking}
          maxLength={150}
          aria-invalid={!!error}
          aria-describedby={error ? 'login-error' : undefined}
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
          disabled={submitting || checking}
          aria-invalid={!!error}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </div>

      <div className={styles.field}>
        <RoleSelector value={role} onChange={setRole} disabled={submitting || checking} />
      </div>

      {error && (
        <p id="login-error" className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={submitting || checking}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
      <p className={styles.register}>Não tem conta? <Link href="/register">Criar conta</Link></p>
    </form>
  );
}
