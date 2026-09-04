import { useEffect, useRef, useState } from 'react';
import { DAppPeerConnect } from '@fabianbormann/cardano-peer-connect';
import { PEERJS } from './config';

export type Cip30Api = Record<string, (...args: unknown[]) => Promise<unknown>> & {
  enable: () => Promise<Cip30Api>;
};

export interface LifecycleEntry {
  time: string;
  message: string;
}

export interface Cip45State {
  peerId: string;
  status: 'disconnected' | 'connected';
  walletAddress: string;
  apiName: string | null;
  api: Cip30Api | null;
  lifecycle: LifecycleEntry[];
}

/**
 * Owns the DAppPeerConnect instance and mirrors its callbacks into React state.
 * `qrRef` must be attached to a container element — the peerjs QR SVG is
 * rendered into it once on mount.
 */
export function useCip45() {
  const qrRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef<DAppPeerConnect | null>(null);
  const [state, setState] = useState<Cip45State>({
    peerId: '',
    status: 'disconnected',
    walletAddress: '',
    apiName: null,
    api: null,
    lifecycle: [],
  });

  const log = (message: string) =>
    setState((s) => ({
      ...s,
      lifecycle: [{ time: new Date().toLocaleTimeString(), message }, ...s.lifecycle].slice(0, 50),
    }));

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke in dev.
    if (connectRef.current) return;

    const dAppConnect = new DAppPeerConnect({
      dAppInfo: { name: 'cip45-react-demo', url: window.location.origin },
      peerJsConfig: PEERJS,
      onConnect: (address: string) => {
        log(`onConnect: ${address}`);
        setState((s) => ({ ...s, status: 'connected', walletAddress: address }));
      },
      onDisconnect: (address: string) => {
        log(`onDisconnect: ${address}`);
        setState((s) => ({
          ...s,
          status: 'disconnected',
          walletAddress: '',
          apiName: null,
          api: null,
        }));
      },
      onApiInject: (name: string) => {
        log(`onApiInject: ${name}`);
        const injected = (window as unknown as { cardano?: Record<string, Cip30Api> }).cardano?.[
          name.toLowerCase()
        ];
        setState((s) => ({ ...s, apiName: name, api: injected ?? null }));
      },
      onApiEject: (name: string) => {
        log(`onApiEject: ${name}`);
        setState((s) => ({ ...s, apiName: null, api: null }));
      },
    });
    connectRef.current = dAppConnect;

    const peerId = dAppConnect.getAddress();
    setState((s) => ({ ...s, peerId }));
    if (qrRef.current) {
      dAppConnect.generateQRCode(qrRef.current);
      // qrcode-svg emits a fixed-size SVG (width/height in px) with no viewBox,
      // so CSS scaling crops it instead of resizing. Add a viewBox from its
      // intrinsic size and make it fluid so it fits the container.
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const w = svg.getAttribute('width') ?? '256';
        const h = svg.getAttribute('height') ?? '256';
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    }

    const onUnload = () => {
      try {
        dAppConnect.shutdownServer();
      } catch {
        /* best effort */
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const disconnect = () => {
    log('dApp: shutdownServer() — notifying wallet');
    connectRef.current?.shutdownServer();
  };

  return { qrRef, state, disconnect };
}
