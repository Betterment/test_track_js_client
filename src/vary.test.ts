import type { Assignment } from './visitor';
import { vary } from './vary';
import { createSplitRegistry } from './splitRegistry';

const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  }
]);

function createAssignment(variant: string | null = 'earth'): Assignment {
  return { splitName: 'element', variant, context: null, isUnsynced: true };
}

describe('vary', () => {
  it('returns the assigned variant when present', () => {
    const assignment = createAssignment('earth');

    const result = vary({
      assignment,
      errorLogger: vi.fn(),
      defaultVariant: 'water',
      splitRegistry
    });

    expect(result).toEqual({ isDefaulted: false, variant: 'earth' });
  });

  it('returns the default variant when assignment variant is null', () => {
    const assignment = createAssignment(null);

    const result = vary({
      assignment,
      errorLogger: vi.fn(),
      defaultVariant: 'water',
      splitRegistry
    });

    expect(result).toEqual({ isDefaulted: true, variant: 'water' });
  });
});
