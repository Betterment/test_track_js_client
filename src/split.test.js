import Split from "./split";

describe('Split', () => {
  let split;
  beforeEach(() => {
    split = new Split('split name', true, { foo: 50, bar: 50, baz: 0 })
  });

  describe('.getVariants()', () => {
    it('returns all variants', () => {
      expect(split.getVariants()).toEqual(['foo', 'bar', 'baz']);
    });
  });

  describe('.getWeighting()', () => {
    it('returns the weightings hash', () => {
      expect(split.getWeighting()).toEqual({ foo: 50, bar: 50, baz: 0 });
    });
  });

  describe('.hasVariant()', () => {
    it('returns whether the variant is defined', () => {
      expect(split.hasVariant('foo')).toEqual(true);
      expect(split.hasVariant('buzz')).toEqual(false);
    });
  });
});
