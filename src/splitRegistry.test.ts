import Split from './split';
import SplitRegistry from './splitRegistry';

function createSplitRegistry() {
  const split1 = new Split('split1', true, { foo: 50, bar: 50, baz: 0 });
  const split2 = new Split('split2', true, { up: 50, down: 50 });
  return new SplitRegistry([split1, split2]);
}

describe('SplitRegistry', () => {
  describe('.getSplit()', () => {
    it('returns the split for the given name', () => {
      const splitRegistry = createSplitRegistry();
      const split = splitRegistry.getSplit('split1');
      expect(split!.getName()).toEqual('split1');
      expect(split!.isFeatureGate()).toEqual(true);
      expect(split!.getWeighting()).toEqual({ foo: 50, bar: 50, baz: 0 });

      expect(splitRegistry.getSplit('unknown split')).toEqual(undefined);
    });
  });

  describe('.isLoaded()', () => {
    it('is not loaded if null is passed in', () => {
      const splitRegistry = createSplitRegistry();
      expect(splitRegistry.isLoaded()).toEqual(true);

      const notLoadedRegistry = new SplitRegistry(null);
      expect(notLoadedRegistry.isLoaded()).toEqual(false);
    });
  });

  describe('.asV1Hash()', () => {
    it('returns a v1 style split registry', () => {
      const splitRegistry = createSplitRegistry();
      expect(splitRegistry.asV1Hash()).toEqual({ split1: { foo: 50, bar: 50, baz: 0 }, split2: { up: 50, down: 50 } });
    });
  });
});
