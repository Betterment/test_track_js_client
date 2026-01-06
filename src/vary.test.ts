import Assignment from './assignment';
import { vary } from './vary';
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

describe('vary', () => {
  it('logs an error if given a variant that is not in the split registry', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);
    const handler = () => {};
    vary({
      assignment,
      visitor,
      defaultVariant: 'leeloo_multipass',
      variants: { leeloo_multipass: handler, water: () => {} },
      splitRegistry: config.splitRegistry
    });

    expect(visitor.logError).toHaveBeenCalledWith('configures unknown variants: leeloo_multipass');
  });

  it('does not log an error when the split registry is not loaded', () => {
    const config = createConfig();

    const assignment = createAssignment();
    const visitor = createVisitor(config);
    vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { leeloo_multipass: () => {}, water: () => {} },
      splitRegistry: config.splitRegistry
    });

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
    vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: {
        leeloo_multipass: () => {},
        water: () => {},
        earth: () => {},
        wind: () => {},
        fire: () => {}
      },
      splitRegistry: config.splitRegistry
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });

  it('throws an error if only one variant is provided', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);

    expect(() => {
      vary({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { water: () => {} },
        splitRegistry: config.splitRegistry
      });
    }).toThrow('must provide at least two variants');
  });

  it('runs the handler of the assigned variant', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { earth: whenHandler, water: defaultHandler },
      splitRegistry: config.splitRegistry
    });

    expect(whenHandler).toHaveBeenCalled();
    expect(defaultHandler).not.toHaveBeenCalled();
  });

  it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    const result = vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { fire: whenHandler, water: defaultHandler },
      splitRegistry: config.splitRegistry
    });

    expect(result).toEqual({ isDefaulted: true });
    expect(defaultHandler).toHaveBeenCalled();
    expect(whenHandler).not.toHaveBeenCalled();
  });

  it('is not defaulted if the assigned variant is represented as the default', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    const result = vary({
      assignment,
      visitor,
      defaultVariant: 'earth',
      variants: { water: whenHandler, earth: defaultHandler },
      splitRegistry: config.splitRegistry
    });

    expect(result).toEqual({ isDefaulted: false });
    expect(defaultHandler).toHaveBeenCalled();
    expect(whenHandler).not.toHaveBeenCalled();
  });

  it('logs an error if not all variants are represented', () => {
    const config = setupConfig();
    const assignment = createAssignment();
    const visitor = createVisitor(config);

    vary({
      assignment,
      visitor,
      defaultVariant: 'fire',
      variants: { earth: vi.fn(), fire: vi.fn() },
      splitRegistry: config.splitRegistry
    });

    expect(visitor.logError).toHaveBeenCalledWith('does not configure variants: wind, water');
  });

  it('does not log an error when the split registry is not loaded', () => {
    const config = createConfig();

    const assignment = createAssignment();
    const visitor = createVisitor(config);
    vary({
      assignment,
      visitor,
      defaultVariant: 'fire',
      variants: { earth: vi.fn(), fire: vi.fn() },
      splitRegistry: config.splitRegistry
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });
});
