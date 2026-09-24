import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Entrar — CondoFlow',
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <span className={styles.brandMark}>CondoFlow</span>
          <h2 className={styles.brandHeadline}>Seu condomínio, em um só lugar.</h2>
          <p className={styles.brandText}>
            Chamados, encomendas, reservas e comunicados — tudo acessível para moradores,
            síndicos, porteiros e prestadores.
          </p>
        </div>
      </aside>

      <main className={styles.formPanel}>
        <LoginForm />
      </main>
    </div>
  );
}
