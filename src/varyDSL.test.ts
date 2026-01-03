import Assignment from './assignment';
import VaryDSL from './varyDSL';
import Visitor from './visitor';
import { createConfig } from './test-utils';
import type { Config } from './config';

function setupConfig() {
  return createConfig({
    splits: {
      element: {
        feature_gate: false,
        weights: { earth: 25, wind: 25, fire: 25, water: 25 }
      }
    }
  });
}

function createAssignment() {
  return new Assignment({ splitName: 'element', variant: 'earth', isUnsynced: true });
}

function createVisitor(config: Config) {
  const assignment = createAssignment();
  const visitor = new Visitor({ config, id: 'visitor_id', assignments: [assignment] });
  visitor.logError = vi.fn();
  return visitor;
}

describe('VaryDSL', () => {
  describe('variants option', () => {
    it('registers variant handlers', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const handler = () => {};
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { earth: handler, water: () => {} }
      });

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        earth: handler,
        water: expect.any(Function)
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const handler = () => {};
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'leeloo_multipass',
        variants: { leeloo_multipass: handler, water: () => {} }
      });

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        leeloo_multipass: handler,
        water: expect.any(Function)
      });

      vary.run();

      expect(visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is not loaded', () => {
      const config = createConfig();

      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { leeloo_multipass: () => {}, water: () => {} }
      });

      vary.run();

      expect(visitor.logError).not.toHaveBeenCalled();
    });

    it('does not log an error for a variant with a 0 weight', () => {
      const config = createConfig({
        splits: {
          element: {
            feature_gate: false,
            weights: { earth: 25, wind: 25, fire: 25, water: 25, leeloo_multipass: 0 }
          }
        }
      });

      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: {
          leeloo_multipass: () => {},
          water: () => {},
          earth: () => {},
          wind: () => {},
          fire: () => {}
        }
      });

      vary.run();

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('defaultVariant option', () => {
    it('sets the default variant', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { water: () => {}, earth: () => {} }
      });

      // @ts-expect-error Private property
      expect(vary._defaultVariant).toBe('water');
    });
  });

  describe('#run()', () => {
    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    it('throws an error if only one variant is provided', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { water: () => {} }
      });

      expect(() => {
        vary.run();
      }).toThrow('must provide at least one `when`');
    });

    it('runs the handler of the assigned variant', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { earth: whenHandler, water: defaultHandler }
      });

      vary.run();

      expect(whenHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { fire: whenHandler, water: defaultHandler }
      });

      expect(vary.run()).toEqual({ isDefaulted: true });

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
    });

    it('is not defaulted if the assigned variant is represented as the default', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'earth',
        variants: { water: whenHandler, earth: defaultHandler }
      });

      expect(vary.run()).toEqual({ isDefaulted: false });

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
    });

    it('logs an error if not all variants are represented', () => {
      const config = setupConfig();
      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'fire',
        variants: { earth: whenHandler, fire: defaultHandler }
      });

      vary.run();

      expect(visitor.logError).toHaveBeenCalledWith('does not configure variants wind and water');
    });

    it('does not log an error when the split registry is not loaded', () => {
      const config = createConfig();

      const assignment = createAssignment();
      const visitor = createVisitor(config);
      const vary = new VaryDSL({
        assignment,
        visitor,
        defaultVariant: 'fire',
        variants: { earth: whenHandler, fire: defaultHandler }
      });

      vary.run();

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });
});
