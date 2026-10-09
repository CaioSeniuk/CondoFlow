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
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.label}>Você é:</legend>
      <div className={styles.grid}>
        {ROLE_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} className={styles.choice}>
              <input type="radio" name="role" value={option.value} checked={selected}
                onChange={() => onChange(option.value)} />
              <span className={selected ? `${styles.option} ${styles.optionSelected}` : styles.option}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
