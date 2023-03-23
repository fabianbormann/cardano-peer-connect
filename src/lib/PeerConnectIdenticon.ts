import { identicon } from '@basementuniverse/marble-identicons';

export default class PeerConnectIdenticon {
  public static getBase64Identicon = (hash: string): string | null => {
    if (hash.length < 68) {
      console.warn(
        'Meerkat connection hash is to short. Not generating identicon.'
      );

      return null;
    }

    return identicon(
      hash
        .split('')
        .reverse()
        .map((char: string, index: number) =>
          index > 0 && index % 10 === 0 ? '-' : char
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
