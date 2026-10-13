'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dashboardPathForRole } from '@/lib/auth';
import { ROLE_OPTIONS, type AuthenticatedUser } from '@/lib/types';
import { useSession } from './SessionProvider';
import styles from './Workspace.module.css';
import { visibleModules } from '@/lib/modules';
import { ModuleIcon } from './ModuleIcon';

function navigationLinks(user: AuthenticatedUser) {
  const modules = user.isSuperuser ? [] : visibleModules(user.role);
  return [
    { href: dashboardPathForRole(user.role, user.isSuperuser), label: user.isSuperuser ? 'Condomínios' : 'Início' },
    ...(user.role === 'manager' && !user.isSuperuser ? [{ href: '/dashboard/users', label: 'Usuários' }] : []),
    ...modules.filter((item) => item.path).map((item) => ({ href: `/dashboard/${item.key}`, label: item.title })),
    ...modules.filter((item) => !item.path).map((item) => ({ href: `/dashboard/${item.key}`, label: item.title })),
    { href: '/dashboard/profile', label: 'Perfil' },
  ];
}

function quickLinks(user: AuthenticatedUser) {
  if (user.isSuperuser) return [];
  if (user.role === 'doorman') {
    return [{ href: '/dashboard/visitors', label: 'Visitantes', icon: 'visitors' },
      { href: '/dashboard/packages', label: 'Encomendas', icon: 'packages' }];
  }
  if (user.role === 'provider') {
    return [{ href: '/dashboard/tickets', label: 'Chamados', icon: 'tickets' },
      { href: '/dashboard/history', label: 'Histórico', icon: 'history' }];
  }
  const secondary = user.role === 'manager'
    ? { href: '/dashboard/users', label: 'Usuários', icon: 'users' }
    : { href: '/dashboard/reservations', label: 'Reservas', icon: 'reservations' };
  return [{ href: '/dashboard/tickets', label: 'Chamados', icon: 'tickets' }, secondary];
}

function bottomNavigationLinks(user: AuthenticatedUser) {
  return [
    { href: dashboardPathForRole(user.role, user.isSuperuser), label: 'Início', icon: 'home' },
    ...quickLinks(user),
    { href: '/dashboard/profile', label: 'Perfil', icon: 'profile' },
  ];
}

function Greeting({ user }: Readonly<{ user: AuthenticatedUser }>) {
  const name = user.firstName || user.username;
  const roleLabel = user.isSuperuser ? 'Administrador global' : ROLE_OPTIONS.find((role) => role.value === user.role)?.label;
  return <div className={styles.greeting}>
    <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
    <div><strong>Olá, {name}</strong>
      <small>{roleLabel}{user.block && ` · Bloco ${user.block}`}{user.apartment && `, apto ${user.apartment}`}</small>
      {user.condominium && <small>{user.condominium.name}</small>}
    </div>
  </div>;
}

export function Workspace({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const links = navigationLinks(user);
  const bottomLinks = bottomNavigationLinks(user);
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
      <Greeting user={user} />
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
