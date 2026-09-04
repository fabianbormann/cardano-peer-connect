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
    <section className="card">
      <div className="conn">
        <div className="qr" ref={qrRef} />
        <div className="conn-details">
          <p className="field-label">Peer ID (share with wallet)</p>
          <code className="peerid">{state.peerId || '…'}</code>
          <div className="btn-row">
            <button className="btn secondary" onClick={copy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {connected && (
              <button className="btn secondary" onClick={onDisconnect}>
                Disconnect
              </button>
            )}
          </div>
          <div className="meta-row">
            <span className={`badge ${connected ? 'ok' : 'off'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className={`badge ${state.apiName ? 'ok' : 'off'}`}>
              {state.apiName ? 'API injected' : 'No API'}
            </span>
          </div>
          {state.walletAddress && (
            <div className="meta-row">
              <span className="field-label" style={{ margin: 0 }}>
                Wallet
              </span>
              <span className="wallet-addr">{state.walletAddress}</span>
            </div>
          )}
        </div>
      </div>

      <p className="field-label" style={{ marginTop: 20 }}>
        Lifecycle Events
      </p>
      <ul className="log">
        {state.lifecycle.length === 0 && <li className="empty">waiting for a wallet…</li>}
        {state.lifecycle.map((e, i) => (
          <li key={i}>
            {e.time} {e.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
