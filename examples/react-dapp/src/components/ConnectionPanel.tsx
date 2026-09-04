import { useState } from 'react';
import type { RefObject } from 'react';
import type { Cip45State } from '../peer';

interface Props {
  qrRef: RefObject<HTMLDivElement>;
  state: Cip45State;
  onDisconnect: () => void;
}

export function ConnectionPanel({ qrRef, state, onDisconnect }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = state.peerId;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch {
        /* nothing to do */
      }
      document.body.removeChild(ta);
    }
  };

  const connected = state.status === 'connected';

  return (
    <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div ref={qrRef} style={{ width: 180, height: 180 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ margin: '0 0 4px' }}>Peer ID (share with wallet):</p>
          <p style={{ fontFamily: 'monospace', margin: '0 0 8px', wordBreak: 'break-all' }}>
            {state.peerId || '…'}
          </p>
          <button onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>{' '}
          {connected && <button onClick={onDisconnect}>Disconnect (shut down)</button>}
          <p style={{ marginTop: 12 }}>
            Status:{' '}
            <strong style={{ color: connected ? 'green' : '#c00' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </strong>
          </p>
          <p style={{ margin: 0 }}>
            API: <strong>{state.apiName ? 'Injected' : 'No API'}</strong>
            {state.walletAddress && (
              <>
                {' '}
                Wallet:{' '}
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {state.walletAddress}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <h3 style={{ marginBottom: 4 }}>Lifecycle Events</h3>
      <ul
        style={{
          listStyle: 'none',
          padding: 6,
          margin: 0,
          border: '1px solid #ddd',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          maxHeight: 160,
          overflow: 'auto',
        }}
      >
        {state.lifecycle.length === 0 && <li style={{ color: '#999' }}>waiting for a wallet…</li>}
        {state.lifecycle.map((e, i) => (
          <li key={i}>
            {e.time} {e.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
