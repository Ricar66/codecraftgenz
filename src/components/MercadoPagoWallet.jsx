// src/components/MercadoPagoWallet.jsx
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import React, { useEffect, useState } from 'react';

const MercadoPagoWallet = ({ preferenceId }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const PK = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.APP_USR_57782f61_a250_4abe_a856_ad9c5860a8a9;
    if (PK) {
      try { initMercadoPago(PK); setReady(true); } catch { setReady(false); }
    }
  }, []);

  if (!preferenceId) return null;
  return (
    <div style={{ width: 360 }}>
      {ready ? <Wallet initialization={{ preferenceId }} /> : <p className="muted">Inicializando Mercado Pago…</p>}
    </div>
  );
};

export default MercadoPagoWallet;