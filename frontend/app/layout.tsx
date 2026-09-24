import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CondoFlow',
  description: 'Acesso ao CondoFlow — moradores, síndicos, porteiros e prestadores.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
