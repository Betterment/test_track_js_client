import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import Visitor from './visitor';
import { createConfig } from './test-utils';
import type { Config } from './config';

function setupConfig() {
  return createConfig({
    splits: {
      logoSize: {
        feature_gate: false,
        weights: { extraGiant: 0, giant: 80, huge: 1, leetle: 0, miniscule: 19, teeny: 0 }
      }
    }
  });
}

function createVisitor(config: Config, id = '00000000-0000-0000-0000-000000000000') {
  const visitor = new Visitor({
    config,
    id,
    assignments: []
  });
  visitor.logError = vi.fn();
  return visitor;
}

describe('getAssignmentBucket()', () => {
  it('calculates the correct bucket for a given visitor and split', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    const bucket = getAssignmentBucket(visitor, 'logoSize');

    // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
    // parseInt('b72dca20', 16) % 100 = 3070557728 % 100 = 92
    expect(bucket).toBe(92);
  });

  it('returns different buckets for different visitors', () => {
    const config = setupConfig();
    const visitor1 = createVisitor(config, 'visitor-1');
    const visitor2 = createVisitor(config, 'visitor-2');

    const bucket1 = getAssignmentBucket(visitor1, 'logoSize');
    const bucket2 = getAssignmentBucket(visitor2, 'logoSize');

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns different buckets for different splits', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    const bucket1 = getAssignmentBucket(visitor, 'split1');
    const bucket2 = getAssignmentBucket(visitor, 'split2');

    expect(bucket1).not.toBe(bucket2);
  });

  it('returns consistent buckets for the same visitor and split', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    const bucket1 = getAssignmentBucket(visitor, 'logoSize');
    const bucket2 = getAssignmentBucket(visitor, 'logoSize');

    expect(bucket1).toBe(bucket2);
  });
});

describe('calculateVariant()', () => {
  it('returns a variant based on visitor ID and split name', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    const variant = calculateVariant(visitor, 'logoSize');
    expect(variant).toBe('miniscule');
  });

  it('returns null if there is no split registry', () => {
    const config = createConfig();
    const visitor = createVisitor(config);

    expect(calculateVariant(visitor, 'logoSize')).toBeNull();
  });

  it('throws and logs an error when given an unknown splitName', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    expect(() => calculateVariant(visitor, 'nonExistentSplit')).toThrow('Unknown split: "nonExistentSplit"');
    expect(visitor.logError).toHaveBeenCalledTimes(1);
    expect(visitor.logError).toHaveBeenCalledWith('Unknown split: "nonExistentSplit"');
  });

  it('deterministically assigns the same visitor to the same variant', () => {
    const config = setupConfig();
    const visitor = createVisitor(config);

    const variant1 = calculateVariant(visitor, 'logoSize');
    const variant2 = calculateVariant(visitor, 'logoSize');

    expect(variant1).toBe(variant2);
  });
});
