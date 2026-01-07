import Assignment from './assignment';
import { vary } from './vary';
import Visitor from './visitor';
import { createClient } from './client';
import { createSplitRegistry, type SplitRegistry } from './splitRegistry';

const client = createClient({ url: 'http://testtrack.dev' });
const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  }
]);

function createAssignment() {
  return new Assignment({ splitName: 'element', variant: 'earth', isUnsynced: true });
}

function createVisitor(splitRegistry: SplitRegistry) {
  const assignment = createAssignment();
  const visitor = new Visitor({ client, splitRegistry, id: 'visitor_id', assignments: [assignment] });
  visitor.logError = vi.fn();
  return visitor;
}

describe('vary', () => {
  it('logs an error if given a variant that is not in the split registry', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);
    const handler = () => {};
    vary({
      assignment,
      visitor,
      defaultVariant: 'leeloo_multipass',
      variants: { leeloo_multipass: handler, water: () => {} },
      splitRegistry
    });

    expect(visitor.logError).toHaveBeenCalledWith('configures unknown variants: leeloo_multipass');
  });

  it('does not log an error when the split registry is not loaded', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(emptySplitRegistry);
    vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { leeloo_multipass: () => {}, water: () => {} },
      splitRegistry: emptySplitRegistry
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });

  it('does not log an error for a variant with a 0 weight', () => {
    const customSplitRegistry = createSplitRegistry([
      {
        name: 'element',
        isFeatureGate: false,
        weighting: { earth: 25, wind: 25, fire: 25, water: 25, leeloo_multipass: 0 }
      }
    ]);

    const assignment = createAssignment();
    const visitor = createVisitor(customSplitRegistry);
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
      splitRegistry: customSplitRegistry
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });

  it('throws an error if only one variant is provided', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);

    expect(() => {
      vary({
        assignment,
        visitor,
        defaultVariant: 'water',
        variants: { water: () => {} },
        splitRegistry
      });
    }).toThrow('must provide at least two variants');
  });

  it('runs the handler of the assigned variant', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { earth: whenHandler, water: defaultHandler },
      splitRegistry
    });

    expect(whenHandler).toHaveBeenCalled();
    expect(defaultHandler).not.toHaveBeenCalled();
  });

  it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    const result = vary({
      assignment,
      visitor,
      defaultVariant: 'water',
      variants: { fire: whenHandler, water: defaultHandler },
      splitRegistry
    });

    expect(result).toEqual({ isDefaulted: true });
    expect(defaultHandler).toHaveBeenCalled();
    expect(whenHandler).not.toHaveBeenCalled();
  });

  it('is not defaulted if the assigned variant is represented as the default', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);

    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    const result = vary({
      assignment,
      visitor,
      defaultVariant: 'earth',
      variants: { water: whenHandler, earth: defaultHandler },
      splitRegistry
    });

    expect(result).toEqual({ isDefaulted: false });
    expect(defaultHandler).toHaveBeenCalled();
    expect(whenHandler).not.toHaveBeenCalled();
  });

  it('logs an error if not all variants are represented', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(splitRegistry);

    vary({
      assignment,
      visitor,
      defaultVariant: 'fire',
      variants: { earth: vi.fn(), fire: vi.fn() },
      splitRegistry
    });

    expect(visitor.logError).toHaveBeenCalledWith('does not configure variants: wind, water');
  });

  it('does not log an error when the split registry is not loaded', () => {
    const assignment = createAssignment();
    const visitor = createVisitor(emptySplitRegistry);
    vary({
      assignment,
      visitor,
      defaultVariant: 'fire',
      variants: { earth: vi.fn(), fire: vi.fn() },
      splitRegistry: emptySplitRegistry
    });

    expect(visitor.logError).not.toHaveBeenCalled();
  });
});
