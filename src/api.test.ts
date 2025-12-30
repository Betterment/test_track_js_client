import { toSearchParams } from './api';

vi.mock('./testTrackConfig');

describe('toSearchParams', () => {
  it('constructs URLSearchParams without empty values', () => {
    expect(toSearchParams({ a: '1', b: '2', c: '3' }).toString()).toEqual('a=1&b=2&c=3');
    expect(toSearchParams({ a: '1', b: undefined, c: '3' }).toString()).toEqual('a=1&c=3');
  });
});
