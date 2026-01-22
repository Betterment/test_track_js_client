import { urlFor } from './index';

describe('urlFor', () => {
  it('adds the path to the base URL', () => {
    expect(urlFor('/api/v1/foo', new URL('https://example.org'))).toEqual(new URL('https://example.org/api/v1/foo'));
    expect(urlFor('/api/v1/foo', new URL('https://example.org/'))).toEqual(new URL('https://example.org/api/v1/foo'));
  });

  it('preserves the path of the base URL', () => {
    expect(urlFor('/api/v1/foo', new URL('https://example.org/tt'))).toEqual(
      new URL('https://example.org/tt/api/v1/foo')
    );

    expect(urlFor('/api/v1/foo', new URL('https://example.org/tt/'))).toEqual(
      new URL('https://example.org/tt/api/v1/foo')
    );
  });
});
