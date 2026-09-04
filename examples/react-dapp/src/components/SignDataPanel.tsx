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

  return (
    <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem', marginTop: '1rem' }}>
      <h2>Sign Data</h2>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>
        Address (blank → change address, hex)
      </label>
      <input
        style={{ width: '100%', fontFamily: 'monospace', padding: '4px 6px', marginBottom: 8 }}
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="leave blank to use the wallet's change address"
      />
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>Message</label>
      <input
        style={{ width: '100%', padding: '4px 6px', marginBottom: 8 }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button disabled={disabled} onClick={signData}>
        Sign Data
      </button>
      {result && (
        <pre
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            padding: 8,
            marginTop: 8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontSize: '0.8rem',
          }}
        >
          {result}
        </pre>
      )}
    </section>
  );
}
