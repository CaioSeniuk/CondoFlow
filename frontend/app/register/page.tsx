import type { Metadata } from 'next';
import { RegisterForm } from '@/components/RegisterForm';
import styles from '../login/page.module.css';

export const metadata: Metadata = { title: 'Criar conta — CondoFlow' };

export default function RegisterPage() {
  return <div className={styles.page}>
    <aside className={styles.brandPanel}>
      <div className={styles.brandContent}>
        <span className={styles.brandMark}>CondoFlow</span>
        <h2 className={styles.brandHeadline}>Seu condomínio, em um só lugar.</h2>
        <p className={styles.brandText}>Com o código fornecido pelo síndico, crie sua conta como morador, porteiro ou prestador.</p>
      </div>
    </aside>
    <main className={styles.formPanel}><RegisterForm /></main>
  </div>;
}
