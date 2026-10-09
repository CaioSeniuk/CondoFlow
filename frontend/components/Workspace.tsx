'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dashboardPathForRole } from '@/lib/auth';
import { ROLE_OPTIONS } from '@/lib/types';
import { useSession } from './SessionProvider';
import styles from './Workspace.module.css';
import { visibleModules } from '@/lib/modules';
import { ModuleIcon } from './ModuleIcon';

export function Workspace({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const links = [
    { href: dashboardPathForRole(user.role, user.isSuperuser), label: user.isSuperuser ? 'Condomínios' : 'Início' },
    ...(user.role === 'manager' && !user.isSuperuser ? [{ href: '/dashboard/users', label: 'Usuários' }] : []),
    ...visibleModules(user.role, user.isSuperuser).filter((item) => item.path).map((item) => ({ href: `/dashboard/${item.key}`, label: item.title })),
    ...visibleModules(user.role, user.isSuperuser).filter((item) => !item.path).map((item) => ({ href: `/dashboard/${item.key}`, label: item.title })),
    { href: '/dashboard/profile', label: 'Perfil' },
  ];
  const bottomLinks = [
    { href: dashboardPathForRole(user.role, user.isSuperuser), label: 'Início', icon: 'home' },
    ...(user.isSuperuser ? [] : user.role === 'doorman'
      ? [{ href: '/dashboard/visitors', label: 'Visitantes', icon: 'visitors' }, { href: '/dashboard/packages', label: 'Encomendas', icon: 'packages' }]
      : user.role === 'provider'
        ? [{ href: '/dashboard/tickets', label: 'Chamados', icon: 'tickets' }, { href: '/dashboard/history', label: 'Histórico', icon: 'history' }]
        : [{ href: '/dashboard/tickets', label: 'Chamados', icon: 'tickets' },
          { href: user.role === 'manager' ? '/dashboard/users' : '/dashboard/reservations', label: user.role === 'manager' ? 'Usuários' : 'Reservas', icon: user.role === 'manager' ? 'users' : 'reservations' }]),
    { href: '/dashboard/profile', label: 'Perfil', icon: 'profile' },
  ];
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href={dashboardPathForRole(user.role, user.isSuperuser)} className={styles.brand}>
          <span className={styles.mark}>C</span> CondoFlow
        </Link>
        <div className={styles.headerActions}>
          {!user.isSuperuser && <Link href="/dashboard/notifications" aria-label="Abrir notificações" className={styles.textButton}>
            <ModuleIcon name="notifications" /></Link>}
          <button className={styles.textButton} onClick={logout}>Sair</button>
        </div>
      </header>
      <div className={styles.greeting}>
        <span className={styles.avatar}>{(user.firstName || user.username).slice(0, 1).toUpperCase()}</span>
        <div><strong>Olá, {user.firstName || user.username}</strong>
          <small>{user.isSuperuser ? 'Administrador global' : ROLE_OPTIONS.find((role) => role.value === user.role)?.label}
            {user.block && ` · Bloco ${user.block}`}{user.apartment && `, apto ${user.apartment}`}
          </small>
          {user.condominium && <small>{user.condominium.name}</small>}
        </div>
      </div>
      <nav className={styles.nav} aria-label="Navegação principal">
        {links.map((link) => <Link key={link.href} href={link.href}
          aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}
      </nav>
      <main className={styles.content}>{children}</main>
      <nav className={styles.bottomNav} aria-label="Navegação rápida">
        {bottomLinks.map((link) => <Link key={link.href} href={link.href} aria-label={`Abrir ${link.label}`}
          aria-current={pathname === link.href ? 'page' : undefined}>
          <ModuleIcon name={link.icon} /><span>{link.label}</span>
        </Link>)}
      </nav>
    </div>
  );
}
