import { useState } from 'react';
import type { Cip30Api } from '../peer';
import { buildSignSubmitSelfSend } from '../evolutionTx';
import { explorerTxUrl } from '../config';

interface Props {
  api: Cip30Api | null;
  disabled: boolean;
}

type Status = { kind: 'idle' } | { kind: 'pending' } | { kind: 'done'; hash: string } | { kind: 'error'; message: string };

export function TxPanel({ api, disabled }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const run = async () => {
    if (!api) return;
    setStatus({ kind: 'pending' });
    try {
      const enabled = await api.enable();
      const hash = await buildSignSubmitSelfSend(enabled, Date.now());
      setStatus({ kind: 'done', hash });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      setStatus({ kind: 'error', message });
    }
  };

  return (
    <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem', marginTop: '1rem' }}>
      <h2>Build + Sign + Submit (self-send with metadata)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Builds a 1 ADA self-send with CIP-20 (label 674) message metadata via Evolution SDK,
        signs it in the wallet, and submits through the wallet. Needs a funded Preprod wallet.
      </p>
      <button disabled={disabled || status.kind === 'pending'} onClick={run}>
        {status.kind === 'pending' ? 'Building / signing / submitting…' : 'Build + sign + submit'}
      </button>
      {status.kind === 'done' && (
        <p style={{ marginTop: 8 }}>
          ✅ Submitted:{' '}
          <a href={explorerTxUrl(status.hash)} target="_blank" rel="noreferrer">
            {status.hash}
          </a>
        </p>
      )}
      {status.kind === 'error' && (
        <pre
          style={{
            background: '#fff0f0',
            border: '1px solid #f0caca',
            padding: 8,
            marginTop: 8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.8rem',
          }}
        >
          ✗ {status.message}
        </pre>
      )}
    </section>
  );
}
