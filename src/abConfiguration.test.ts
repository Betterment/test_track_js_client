import { getABVariants } from './abConfiguration';
import Visitor from './visitor';
import { createConfig } from './test-utils';
import type { Config } from './config';

function setupConfig() {
  return createConfig({
    splits: {
      element: {
        feature_gate: false,
        weights: { earth: 25, wind: 25, fire: 25, water: 25 }
      },
      button_color: {
        feature_gate: false,
        weights: { red: 50, blue: 50 }
      },
      new_feature: {
        feature_gate: false,
        weights: { true: 100 }
      }
    }
  });
}

function createVisitor(config: Config) {
  const visitor = new Visitor({ config, id: 'visitor_id', assignments: [] });
  visitor.logError = vi.fn();
  return visitor;
}

describe('getABVariants()', () => {
  it('logs an error if the split does not have exactly two variants', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    getABVariants({
      splitName: 'element',
      trueVariant: 'water',
      visitor: visitor
    });

    expect(visitor.logError).toHaveBeenCalledWith('A/B for element configures split with more than 2 variants');
  });

  it('does not log an error if the split registry is not loaded', () => {
    const config = createConfig();
    const visitor = createVisitor(config);

    getABVariants({
      splitName: 'element',
      trueVariant: 'water',
      visitor
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });

  describe('true variant', () => {
    it('accepts `true` as a fallback value', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'true',
        visitor: createVisitor(config)
      });

      expect(variants.true).toBe('true');
    });

    it('is true if only one variant in the split', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'new_feature',
        trueVariant: 'true',
        visitor: createVisitor(config)
      });

      expect(variants.true).toBe('true');
    });

    it('is whatever was passed in', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        visitor: createVisitor(config)
      });

      expect(variants.true).toBe('red');
    });
  });

  describe('false variant', () => {
    it('is the variant of the split that is not the true_variant', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        visitor: createVisitor(config)
      });

      expect(variants.false).toBe('blue');
    });

    it('is false when there is no split_registry', () => {
      const config = createConfig();
      const variants = getABVariants({
        splitName: 'button_color',
        trueVariant: 'red',
        visitor: createVisitor(config)
      });

      expect(variants.false).toBe('false');
    });

    it('is always the same if the split has more than two variants', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'element',
        trueVariant: 'earth',
        visitor: createVisitor(config)
      });

      expect(variants.false).toBe('fire');
    });

    it('is false if only one variant in the split', () => {
      const config = setupConfig();
      const variants = getABVariants({
        splitName: 'new_feature',
        trueVariant: 'true',
        visitor: createVisitor(config)
      });

      expect(variants.false).toBe('false');
    });
  });
});
