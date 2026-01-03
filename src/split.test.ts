import Split from './split';

function createSplit() {
  return new Split('split name', true, { foo: 50, bar: 50, baz: 0 });
}

describe('Split', () => {
  describe('.getVariants()', () => {
    it('returns all variants', () => {
      const split = createSplit();
      expect(split.getVariants()).toEqual(['foo', 'bar', 'baz']);
    });
  });

  describe('.weighting', () => {
    it('returns the weightings hash', () => {
      const split = createSplit();
      expect(split.weighting).toEqual({ foo: 50, bar: 50, baz: 0 });
    });
  });

  describe('.hasVariant()', () => {
    it('returns whether the variant is defined', () => {
      const split = createSplit();
      expect(split.hasVariant('foo')).toEqual(true);
      expect(split.hasVariant('buzz')).toEqual(false);
    });
  });
});
