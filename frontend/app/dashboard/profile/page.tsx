'use client';

import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { UserDetails } from '@/components/UserDetails';
import styles from '@/components/Workspace.module.css';

export default function ProfilePage() {
  const { user, logout } = useSession();
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  const initials = `${(user.firstName || user.username).slice(0, 1)}${user.lastName.slice(0, 1)}`.toUpperCase();
  return <>
    <h1>Perfil</h1>
    <section className={styles.card} aria-label="Dados pessoais">
      <div className={styles.profileHeading}>
        <span className={styles.profileAvatar}>{initials}</span>
        <h2>{name}</h2>
        <p className={styles.muted}>Dados da sua conta no CondoFlow</p>
      </div>
      <UserDetails user={user} />
    </section>
    <p className={styles.muted}>{user.isSuperuser
      ? 'Esta conta administrativa é gerenciada pelo provisionamento do sistema.'
      : user.role === 'manager'
      ? <>Atualize seus dados na <Link href="/dashboard/users">gestão de usuários</Link>.</>
      : 'Para atualizar seus dados, entre em contato com o síndico.'}</p>
    <button className={styles.danger} onClick={logout}>Sair da conta</button>
  </>;
}
