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
    <section className="card">
      <h2>CIP-30 Read Methods</h2>
      <div className="btn-row">
        {READ_METHODS.map((m) => (
          <button
            key={m}
            className="btn secondary"
            disabled={disabled}
            onClick={() => {
              setLog([]);
              call(m);
            }}
          >
            {m}
          </button>
        ))}
        <button className="btn" disabled={disabled} onClick={runAll}>
          Run all
        </button>
      </div>
      {log.length > 0 && <pre className="console">{log.join('\n')}</pre>}
    </section>
  );
}
