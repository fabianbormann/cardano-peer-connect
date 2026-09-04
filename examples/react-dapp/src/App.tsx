import { useCip45 } from './peer';
import { ConnectionPanel } from './components/ConnectionPanel';
import { ReadMethods } from './components/ReadMethods';
import { SignDataPanel } from './components/SignDataPanel';
import { TxPanel } from './components/TxPanel';

export function App() {
  const { qrRef, state, disconnect } = useCip45();
  const connected = state.status === 'connected';
  const hasApi = !!state.api;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '2rem auto',
        padding: '0 1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1>CIP-45 Demo dApp</h1>
      <p style={{ color: '#555' }}>
        Peer-to-peer wallet connection over WebRTC, exercising the full CIP-30 API and a real
        self-send transaction with metadata built via Evolution SDK (Preprod).
      </p>

      <ConnectionPanel qrRef={qrRef} state={state} onDisconnect={disconnect} />

      {connected && (
        <>
          <ReadMethods api={state.api} disabled={!hasApi} />
          <SignDataPanel api={state.api} disabled={!hasApi} />
          <TxPanel api={state.api} disabled={!hasApi} />
        </>
      )}
    </main>
  );
}
