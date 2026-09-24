'use client';

import { ROLE_OPTIONS, type UserRole } from '@/lib/types';
import styles from './RoleSelector.module.css';

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <div>
      <span className={styles.label}>Você é:</span>
      <div className={styles.grid} role="radiogroup" aria-label="Selecione seu perfil">
        {ROLE_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={selected ? `${styles.option} ${styles.optionSelected}` : styles.option}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
