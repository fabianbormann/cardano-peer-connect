import { useState } from 'react';
import type { Cip30Api } from '../peer';

interface Props {
  api: Cip30Api | null;
  disabled: boolean;
}

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function SignDataPanel({ api, disabled }: Props) {
  const [addr, setAddr] = useState('');
  const [message, setMessage] = useState('Hello, Cardano!');
  const [result, setResult] = useState<string>('');

  const signData = async () => {
    if (!api) return;
    setResult('signing…');
    try {
      const enabled = await api.enable();
      // Default to the wallet's own change address if none typed.
      let address = addr.trim();
      if (!address) {
        address = (await enabled.getChangeAddress()) as string;
        setAddr(address);
      }
      const res = await enabled.signData(address, textToHex(message));
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(`✗ ${JSON.stringify(e)}`);
    }
  };

  const isError = result.startsWith('✗');

  return (
    <section className="card">
      <h2>Sign Data</h2>
      <label className="form-label">Address (blank → change address, hex)</label>
      <input
        className="input mono"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="leave blank to use the wallet's change address"
      />
      <label className="form-label">Message</label>
      <input
        className="input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="btn" disabled={disabled} onClick={signData}>
        Sign Data
      </button>
      {result && <pre className={`console${isError ? ' error' : ''}`}>{result}</pre>}
    </section>
  );
}
