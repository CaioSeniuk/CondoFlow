'use client';

import { ROLE_OPTIONS, type UserInput } from '@/lib/types';
import styles from './Workspace.module.css';

export function UserFields({ input, onChange, password, onPasswordChange, disabled, publicRegistration = false }: Readonly<{
  input: UserInput;
  onChange: (input: UserInput) => void;
  password?: string;
  onPasswordChange?: (password: string) => void;
  disabled: boolean;
  publicRegistration?: boolean;
}>) {
  const set = (key: Exclude<keyof UserInput, 'role'>, value: string) => onChange({ ...input, [key]: value });
  return <fieldset disabled={disabled} className={styles.fieldset}>
    <div className={styles.fields}>
      <label className={`${styles.field} ${styles.wide}`}><span>Usuário *</span>
        <input value={input.username} onChange={(e) => set('username', e.target.value)}
          required maxLength={150} autoComplete="username" pattern=".*\S.*" />
      </label>
      {onPasswordChange && <label className={`${styles.field} ${styles.wide}`}><span>Senha * (mínimo de 8 caracteres)</span>
        <input type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)}
          required minLength={8} autoComplete="new-password" />
      </label>}
      <label className={styles.field}><span>Nome</span>
        <input value={input.firstName} onChange={(e) => set('firstName', e.target.value)} maxLength={150} autoComplete="given-name" />
      </label>
      <label className={styles.field}><span>Sobrenome</span>
        <input value={input.lastName} onChange={(e) => set('lastName', e.target.value)} maxLength={150} autoComplete="family-name" />
      </label>
      <label className={`${styles.field} ${styles.wide}`}><span>E-mail *</span>
        <input type="email" value={input.email} onChange={(e) => set('email', e.target.value)} required autoComplete="email" />
      </label>
      <label className={styles.field}><span>Perfil *</span>
        <select value={input.role} onChange={(e) => {
          const role = ROLE_OPTIONS.find((option) => option.value === e.target.value && (!publicRegistration || option.value !== 'manager'));
          if (role) onChange({ ...input, role: role.value });
        }}>
          {ROLE_OPTIONS.filter((role) => !publicRegistration || role.value !== 'manager')
            .map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
      </label>
      <label className={styles.field}><span>Telefone</span>
        <input type="tel" value={input.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} autoComplete="tel" />
      </label>
      <label className={styles.field}><span>Bloco</span>
        <input value={input.block} onChange={(e) => set('block', e.target.value)} maxLength={10} />
      </label>
      <label className={styles.field}><span>Apartamento</span>
        <input value={input.apartment} onChange={(e) => set('apartment', e.target.value)} maxLength={10} />
      </label>
    </div>
  </fieldset>;
}
