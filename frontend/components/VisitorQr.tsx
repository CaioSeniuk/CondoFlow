'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import styles from './Workspace.module.css';

export function VisitorQr({ token }: { token: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setImage(null); setError(null);
    QRCode.toDataURL(token, { width: 220, margin: 2 }).then((url) => {
      if (active) setImage(url);
    }).catch(() => { if (active) setError('Não foi possível gerar o QR Code. Use o token abaixo.'); });
    return () => { active = false; };
  }, [token]);
  return <div>
    {image && <img src={image} width={220} height={220} alt="QR Code de acesso do visitante" />}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <label className={styles.field}>Token de acesso
      <input readOnly value={token} onFocus={(event) => event.target.select()} />
    </label>
    {image && <p><a className={styles.secondary} href={image} download="acesso-visitante.png">Baixar QR Code</a></p>}
  </div>;
}
