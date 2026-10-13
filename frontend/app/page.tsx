import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return <main className={styles.page}>
    <div className={styles.content}>
      <span className={styles.logo}>C</span>
      <h1>CondoFlow</h1>
      <p>Tudo do seu condomínio em um só lugar</p>
      <Link className={styles.start} href="/register">Começar</Link>
      <Link className={styles.login} href="/login">Já tem conta? Entrar</Link>
    </div>
  </main>;
}
