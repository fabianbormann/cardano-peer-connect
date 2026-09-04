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
    <section className="card">
      <h2>Build + Sign + Submit (self-send with metadata)</h2>
      <p className="hint">
        Builds a 1 ADA self-send with CIP-20 (label 674) message metadata via Evolution SDK,
        signs it in the wallet, and submits through the wallet. Needs a funded Preprod wallet.
      </p>
      <button className="btn" disabled={disabled || status.kind === 'pending'} onClick={run}>
        {status.kind === 'pending' ? 'Building / signing / submitting…' : 'Build + sign + submit'}
      </button>
      {status.kind === 'done' && (
        <p className="hash-line">
          ✅ Submitted:{' '}
          <a href={explorerTxUrl(status.hash)} target="_blank" rel="noreferrer">
            {status.hash}
          </a>
        </p>
      )}
      {status.kind === 'error' && <pre className="console error">✗ {status.message}</pre>}
    </section>
  );
}
