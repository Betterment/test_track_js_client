import { getABVariants } from './abConfiguration';
import { createSplitRegistry } from './splitRegistry';

const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  },
  {
    name: 'button_color',
    isFeatureGate: false,
    weighting: { red: 50, blue: 50 }
  },
  {
    name: 'new_feature',
    isFeatureGate: false,
    weighting: { true: 100 }
  }
]);

describe('getABVariants()', () => {
  it('logs an error if the split does not have exactly two variants', () => {
    const logError = vi.fn();

    getABVariants({
      splitName: 'element',
      trueVariant: 'water',
      logError,
      splitRegistry
    });

    expect(logError).toHaveBeenCalledWith('A/B for element configures split with more than 2 variants');
  });

  it('does not log an error if the split registry is not loaded', () => {
    const logError = vi.fn();

    getABVariants({
      splitName: 'element',
      trueVariant: 'water',
      logError,
      splitRegistry: emptySplitRegistry
    });

    expect(logError).not.toHaveBeenCalled();
  });

  describe('true variant', () => {
    it('accepts `true` as a fallback value', () => {
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'true',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.true).toBe('true');
    });

    it('is true if only one variant in the split', () => {
      const variants = getABVariants({
        splitName: 'new_feature',
        trueVariant: 'true',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.true).toBe('true');
    });

    it('is whatever was passed in', () => {
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.true).toBe('red');
    });
  });

  describe('false variant', () => {
    it('is the variant of the split that is not the true_variant', () => {
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.false).toBe('blue');
    });

    it('is false when there is no split_registry', () => {
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        logError: vi.fn(),
        splitRegistry: emptySplitRegistry
      });

      expect(variants.false).toBe('false');
    });

    it('is always the same if the split has more than two variants', () => {
      const variants = getABVariants({
        splitName: 'element',
        trueVariant: 'earth',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.false).toBe('fire');
    });

    it('is false if only one variant in the split', () => {
      const variants = getABVariants({
        splitName: 'new_feature',
        trueVariant: 'true',
        logError: vi.fn(),
        splitRegistry
      });

      expect(variants.false).toBe('false');
    });
  });
});
