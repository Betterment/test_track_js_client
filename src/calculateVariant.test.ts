import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import Visitor from './visitor';
import { createClient } from './client';
import { createSplitRegistry, type SplitRegistry } from './splitRegistry';

const client = createClient({ url: 'http://testtrack.dev' });
const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'logoSize',
    isFeatureGate: false,
    weighting: { extraGiant: 0, giant: 80, huge: 1, leetle: 0, miniscule: 19, teeny: 0 }
  }
]);

function createVisitor(splitRegistry: SplitRegistry, id = '00000000-0000-0000-0000-000000000000') {
  return new Visitor({ client, splitRegistry, id, assignments: [] });
}

describe('getAssignmentBucket()', () => {
  it('calculates the correct bucket for a given visitor and split', () => {
    const visitor = createVisitor(splitRegistry);

    const bucket = getAssignmentBucket(visitor, 'logoSize');

    // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
    // parseInt('b72dca20', 16) % 100 = 3070557728 % 100 = 92
    expect(bucket).toBe(92);
  });

  it('returns different buckets for different visitors', () => {
    const visitor1 = createVisitor(splitRegistry, 'visitor-1');
    const visitor2 = createVisitor(splitRegistry, 'visitor-2');

    const bucket1 = getAssignmentBucket(visitor1, 'logoSize');
    const bucket2 = getAssignmentBucket(visitor2, 'logoSize');

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns different buckets for different splits', () => {
    const visitor = createVisitor(splitRegistry);

    const bucket1 = getAssignmentBucket(visitor, 'split1');
    const bucket2 = getAssignmentBucket(visitor, 'split2');

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns consistent buckets for the same visitor and split', () => {
    const visitor = createVisitor(splitRegistry);

    const bucket1 = getAssignmentBucket(visitor, 'logoSize');
    const bucket2 = getAssignmentBucket(visitor, 'logoSize');

    expect(bucket1).toBe(bucket2);
  });
});

describe('calculateVariant()', () => {
  it('returns a variant based on visitor ID and split name', () => {
    const visitor = createVisitor(splitRegistry);

    const variant = calculateVariant({ visitor, splitRegistry, splitName: 'logoSize' });
    expect(variant).toBe('miniscule');
  });

  it('returns null if there is no split registry', () => {
    const visitor = createVisitor(emptySplitRegistry);

    expect(calculateVariant({ visitor, splitRegistry: emptySplitRegistry, splitName: 'logoSize' })).toBeNull();
  });

  it('throws and logs an error when given an unknown splitName', () => {
    const visitor = createVisitor(splitRegistry);
    const errorLogger = vi.fn();

    visitor.setErrorLogger(errorLogger);

    expect(() => calculateVariant({ visitor, splitRegistry, splitName: 'nonExistentSplit' })).toThrow(
      'Unknown split: "nonExistentSplit"'
    );
    expect(errorLogger).toHaveBeenCalledWith('Unknown split: "nonExistentSplit"');
  });

  it('deterministically assigns the same visitor to the same variant', () => {
    const visitor = createVisitor(splitRegistry);

    const variant1 = calculateVariant({ visitor, splitRegistry, splitName: 'logoSize' });
    const variant2 = calculateVariant({ visitor, splitRegistry, splitName: 'logoSize' });

    expect(variant1).toBe(variant2);
  });
});
