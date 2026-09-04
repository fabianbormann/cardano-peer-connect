import { useState } from 'react';
import type { Cip30Api } from '../peer';

const READ_METHODS = [
  'getNetworkId',
  'getBalance',
  'getUtxos',
  'getCollateral',
  'getUsedAddresses',
  'getUnusedAddresses',
  'getChangeAddress',
  'getRewardAddresses',
] as const;

interface Props {
  api: Cip30Api | null;
  disabled: boolean;
}

export function ReadMethods({ api, disabled }: Props) {
  const [log, setLog] = useState<string[]>([]);
  const append = (line: string) => setLog((l) => [...l, line]);

  const call = async (name: string) => {
    if (!api) return;
    try {
      const enabled = await api.enable();
      const fn = enabled[name];
      if (typeof fn !== 'function') throw { info: 'method not exposed by wallet' };
      const res = await fn();
      append(`${name} → ${JSON.stringify(res)}`);
    } catch (e) {
      append(`${name} ✗ ${JSON.stringify(e)}`);
    }
  };

  const runAll = async () => {
    setLog([]);
    for (const m of READ_METHODS) {
      // Sequential so the log stays ordered and the tunnel is exercised repeatedly.
      await call(m);
    }
  };

  return (
    <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem', marginTop: '1rem' }}>
      <h2>CIP-30 Read Methods</h2>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {READ_METHODS.map((m) => (
          <button
            key={m}
            disabled={disabled}
            onClick={() => {
              setLog([]);
              call(m);
            }}
          >
            {m}
          </button>
        ))}
        <button disabled={disabled} onClick={runAll}>
          Run all
        </button>
      </div>
      {log.length > 0 && (
        <pre
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            padding: 8,
            marginTop: 8,
            maxHeight: 240,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.8rem',
          }}
        >
          {log.join('\n')}
        </pre>
      )}
    </section>
  );
}
