import { createSplitRegistry, getSplitVariants, type Split } from './splitRegistry';

function setupSplitRegistry() {
  return createSplitRegistry([
    { name: 'split1', isFeatureGate: true, weighting: { foo: 50, bar: 50, baz: 0 } },
    { name: 'split2', isFeatureGate: true, weighting: { up: 50, down: 50 } }
  ]);
}

describe('createSplitRegistry', () => {
  describe('.getSplit()', () => {
    it('returns the split for the given name', () => {
      const splitRegistry = setupSplitRegistry();
      const split = splitRegistry.getSplit('split1');
      expect(split!.name).toEqual('split1');
      expect(split!.isFeatureGate).toEqual(true);
      expect(split!.weighting).toEqual({ foo: 50, bar: 50, baz: 0 });

      expect(splitRegistry.getSplit('unknown split')).toEqual(undefined);
    });
  });

  describe('.isLoaded', () => {
    it('is not loaded if null is passed in', () => {
      const splitRegistry = setupSplitRegistry();
      expect(splitRegistry.isLoaded).toEqual(true);

      const notLoadedRegistry = createSplitRegistry(null);
      expect(notLoadedRegistry.isLoaded).toEqual(false);
    });
  });

  describe('.asV1Hash()', () => {
    it('returns a v1 style split registry', () => {
      const splitRegistry = setupSplitRegistry();
      expect(splitRegistry.asV1Hash()).toEqual({ split1: { foo: 50, bar: 50, baz: 0 }, split2: { up: 50, down: 50 } });
    });
  });
});

describe('getSplitVariants()', () => {
  it('returns all variants', () => {
    const split: Split = {
      name: 'split name',
      isFeatureGate: true,
      weighting: { foo: 50, bar: 50, baz: 0 }
    };

    expect(getSplitVariants(split)).toEqual(['foo', 'bar', 'baz']);
  });
});
