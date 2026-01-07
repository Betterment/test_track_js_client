import { getSplitVariants, type Split } from './split';

describe('.getVariants()', () => {
  it('returns all variants', () => {
    const split: Split = {
      name: 'split name',
      isFeatureGate: true,
      weighting: { foo: 50, bar: 50, baz: 0 }
    };

    expect(getSplitVariants(split)).toEqual(['foo', 'bar', 'baz']);
  });
});
