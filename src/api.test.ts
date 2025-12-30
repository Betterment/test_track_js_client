import { toSearchParams } from './api';

describe('toSearchParams', () => {
  it('constructs URLSearchParams without empty values', () => {
    expect(toSearchParams({ a: '1', b: '2', c: '3' }).toString()).toEqual('a=1&b=2&c=3');
    expect(toSearchParams({ a: '1', b: null, c: '3' }).toString()).toEqual('a=1&b=&c=3');
    expect(toSearchParams({ a: '1', b: undefined, c: '3' }).toString()).toEqual('a=1&c=3');
  });
});
