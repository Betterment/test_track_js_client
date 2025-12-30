import ABConfiguration from './abConfiguration';
import SplitRegistry from './splitRegistry';
import Visitor from './visitor';
import { mockSplitRegistry, createConfig } from './test-utils';
import type { Config } from './testTrackConfig';

let config: Config;

function createVisitor() {
  const visitor = new Visitor({ config, id: 'visitor_id', assignments: [] });
  visitor.logError = vi.fn();
  return visitor;
}

describe('ABConfiguration', () => {
  beforeEach(() => {
    config = createConfig();
    config.getSplitRegistry = mockSplitRegistry({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      },
      button_color: {
        red: 50,
        blue: 50
      },
      new_feature: {
        true: 100
      }
    });
  });

  it('requires a splitName', () => {
    const visitor = createVisitor();

    expect(() => {
      // @ts-expect-error Testing missing required property
      new ABConfiguration({ trueVariant: 'red', visitor: visitor });
    }).toThrow('must provide splitName');
  });

  it('requires an trueVariant', () => {
    const visitor = createVisitor();

    expect(() => {
      new ABConfiguration({ splitName: 'button_color', visitor: visitor });
    }).toThrow('must provide trueVariant');
  });

  it('requires a visitor', () => {
    expect(() => {
      // @ts-expect-error Testing missing required property
      new ABConfiguration({ splitName: 'button_color', trueVariant: 'red' });
    }).toThrow('must provide visitor');
  });

  it('allows a null trueVariant', () => {
    const visitor = createVisitor();

    expect(() => {
      new ABConfiguration({
        splitName: 'button_color',
        // @ts-expect-error Testing null value
        trueVariant: null,
        visitor: visitor
      });
    }).not.toThrow();
  });

  describe('#getVariants()', () => {
    it('logs an error if the split does not have exactly two variants', () => {
      const visitor = createVisitor();
      const abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor: visitor
      });

      abConfiguration.getVariants();

      expect(visitor.logError).toHaveBeenCalledWith('A/B for element configures split with more than 2 variants');
    });

    it('does not log an error if the split registry is not loaded', () => {
      vi.mocked(config.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      const visitor = createVisitor();
      const abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor
      });

      abConfiguration.getVariants();

      expect(visitor.logError).not.toHaveBeenCalled();
    });

    describe('true variant', () => {
      it('is true if null was passed in during instantiation', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          // @ts-expect-error Testing null value
          trueVariant: null,
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().true).toBe('true');
      });

      it('is true if only one variant in the split', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'new_feature',
          // @ts-expect-error Testing null value
          trueVariant: null,
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().true).toBe('true');
      });

      it('is whatever was passed in during instantiation', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().true).toBe('red');
      });
    });

    describe('false variant', () => {
      it('is the variant of the split that is not the true_variant', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().false).toBe('blue');
      });

      it('is false when there is no split_registry', () => {
        vi.mocked(config.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

        const abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().false).toBe('false');
      });

      it('is always the same if the split has more than two variants', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'element',
          trueVariant: 'earth',
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().false).toBe('fire');
      });

      it('is false if only one variant in the split', () => {
        const abConfiguration = new ABConfiguration({
          splitName: 'new_feature',
          // @ts-expect-error Testing null value
          trueVariant: null,
          visitor: createVisitor()
        });

        expect(abConfiguration.getVariants().false).toBe('false');
      });
    });
  });
});
