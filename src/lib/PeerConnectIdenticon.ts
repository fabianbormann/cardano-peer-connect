import { identicon } from '@basementuniverse/marble-identicons';

export default class PeerConnectIdenticon {
  public static getBase64Identicon = (hash: string): string | null => {
    if (hash.length < 20) {
      console.warn(
        'Connection hash is too short (< 20 chars). Not generating identicon.'
      );

      return null;
    }

    // Peer ids already contain '-' (e.g. `wallet-<hash>-<timestamp>`). The
    // underlying identicon lib splits its seed on /[\s\-']/ to build initials
    // and crashes (`i[0].toUpperCase()` on an empty token) when two delimiters
    // land next to each other. Strip pre-existing delimiters first so the only
    // '-' characters left are the ones we control below (always >=10 apart and
    // never at the first/last position), guaranteeing no adjacent/boundary hits.
    const sanitized = hash.replace(/[\s\-']/g, '');

    return identicon(
      sanitized
        .split('')
        .reverse()
        .map((char: string, index: number) =>
          index > 0 && index < sanitized.length - 1 && index % 10 === 0
            ? '-'
            : char
        )
        .join(''),
      {
        size: 100,
        baseSeed: 'cardano-peer-connect',
        fontSize: 0.17,
        initialsColours: ['#000000', '#FF0000', '#0000FF'],
      }
    ).toDataURL();
  };
}
