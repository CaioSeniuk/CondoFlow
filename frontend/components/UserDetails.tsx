import { ROLE_OPTIONS, type AuthenticatedUser } from '@/lib/types';
import styles from './Workspace.module.css';

export function UserDetails({ user }: { user: AuthenticatedUser }) {
  const fields = [
    ['Usuário', user.username],
    ['E-mail', user.email],
    ['Perfil', user.isSuperuser ? 'Administrador global' : ROLE_OPTIONS.find((role) => role.value === user.role)?.label],
    ['Telefone', user.phone],
    ['Bloco', user.block],
    ['Apartamento', user.apartment],
    ['Situação', user.isActive ? 'Ativo' : 'Inativo'],
    ['Condomínio', user.condominium?.name ?? user.condominiumId],
  ];
  return <dl className={styles.details}>{fields.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>
  ))}</dl>;
}
