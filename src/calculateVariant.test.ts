import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import { createSplitRegistry } from './splitRegistry';

const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'logoSize',
    isFeatureGate: false,
    weighting: { extraGiant: 0, giant: 80, huge: 1, leetle: 0, miniscule: 19, teeny: 0 }
  }
]);

describe('getAssignmentBucket()', () => {
  it('calculates the correct bucket for a given visitor and split', () => {
    const visitorId = '00000000-0000-0000-0000-000000000000';

    const bucket = getAssignmentBucket({ visitorId, splitName: 'logoSize' });

    // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
    // parseInt('b72dca20', 16) % 100 = 3070557728 % 100 = 92
    expect(bucket).toBe(92);
  });

  it('returns different buckets for different visitors', () => {
    const visitorId1 = 'visitor-1';
    const visitorId2 = 'visitor-2';

    const bucket1 = getAssignmentBucket({ visitorId: visitorId1, splitName: 'logoSize' });
    const bucket2 = getAssignmentBucket({ visitorId: visitorId2, splitName: 'logoSize' });

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns different buckets for different splits', () => {
    const visitorId = '00000000-0000-0000-0000-000000000000';

    const bucket1 = getAssignmentBucket({ visitorId, splitName: 'split1' });
    const bucket2 = getAssignmentBucket({ visitorId, splitName: 'split2' });

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns consistent buckets for the same visitor and split', () => {
    const visitorId = '00000000-0000-0000-0000-000000000000';

    const bucket1 = getAssignmentBucket({ visitorId, splitName: 'logoSize' });
    const bucket2 = getAssignmentBucket({ visitorId, splitName: 'logoSize' });

    expect(bucket1).toBe(bucket2);
  });
});

describe('calculateVariant()', () => {
  it('returns a variant based on visitor ID and split name', () => {
    const visitorId = '00000000-0000-0000-0000-000000000000';
    const assignmentBucket = getAssignmentBucket({ visitorId, splitName: 'logoSize' });

    const variant = calculateVariant({ assignmentBucket, splitRegistry, splitName: 'logoSize' });
    expect(variant).toBe('miniscule');
  });

  it('returns null if there is no split registry', () => {
    const assignmentBucket = 50;

    expect(calculateVariant({ assignmentBucket, splitRegistry: emptySplitRegistry, splitName: 'logoSize' })).toBeNull();
  });

  it('throws an error when given an unknown splitName', () => {
    const assignmentBucket = 50;

    expect(() => calculateVariant({ assignmentBucket, splitRegistry, splitName: 'nonExistentSplit' })).toThrow(
      'Unknown split: "nonExistentSplit"'
    );
  });

  it('deterministically assigns the same bucket to the same variant', () => {
    const assignmentBucket = 50;

    const variant1 = calculateVariant({ assignmentBucket, splitRegistry, splitName: 'logoSize' });
    const variant2 = calculateVariant({ assignmentBucket, splitRegistry, splitName: 'logoSize' });

    expect(variant1).toBe(variant2);
  });
});
