import SplitRegistry from './splitRegistry';
import VariantCalculator, { type VariantCalculatorOptions } from './variantCalculator';
import Visitor from './visitor';
import { mockSplitRegistry, createConfig } from './test-utils';
import type { Config } from './testTrackConfig';

describe('VariantCalculator', () => {
  let config: Config;
  let visitor: Visitor;
  let calculator: VariantCalculator;
  let calculatorOptions: VariantCalculatorOptions;

  function createCalculator() {
    return new VariantCalculator(calculatorOptions);
  }

  beforeEach(() => {
    config = createConfig();
    visitor = new Visitor({
      config,
      id: '00000000-0000-0000-0000-000000000000',
      assignments: []
    });
    visitor.logError = vi.fn();

    calculatorOptions = {
      visitor: visitor,
      splitName: 'logoSize'
    };

    calculator = createCalculator();

    config.getSplitRegistry = mockSplitRegistry({
      logoSize: {
        extraGiant: 0,
        giant: 80,
        huge: 1,
        leetle: 0,
        miniscule: 19,
        teeny: 0
      }
    });
  });

  it('requires a visitor', () => {
    // @ts-expect-error Testing deletion of required property
    delete calculatorOptions.visitor;
    expect(() => createCalculator()).toThrow('must provide visitor');
  });

  it('requires a splitName', () => {
    // @ts-expect-error Testing deletion of required property
    delete calculatorOptions.splitName;
    expect(() => createCalculator()).toThrow('must provide splitName');
  });

  describe('#getSplitVisitorHash()', () => {
    it('calculates MD5 of splitName and visitorId', () => {
      // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
      expect(calculator.getSplitVisitorHash()).toBe('b72dca208c59ddeab8a1b9bc22f12224');
    });
  });

  describe('#getHashFixnum()', () => {
    it('converts 00000000deadbeef into 0', () => {
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('00000000deadbeef');
      expect(calculator.getHashFixnum()).toBe(0);
    });

    it('converts 0000000fdeadbeef into 15', () => {
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('0000000fdeadbeef');
      expect(calculator.getHashFixnum()).toBe(15);
    });

    it('converts ffffffffdeadbeef into 4294967295', () => {
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('ffffffffdeadbeef');
      expect(calculator.getHashFixnum()).toBe(4294967295);
    });
  });

  describe('#getAssignmentBucket()', () => {
    it('puts 0 in bucket 0', () => {
      calculator.getHashFixnum = vi.fn().mockReturnValue(0);
      expect(calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 99 in bucket 99', () => {
      calculator.getHashFixnum = vi.fn().mockReturnValue(99);
      expect(calculator.getAssignmentBucket()).toBe(99);
    });

    it('puts 100 in bucket 0', () => {
      calculator.getHashFixnum = vi.fn().mockReturnValue(100);
      expect(calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 4294967295 in bucket 95', () => {
      calculator.getHashFixnum = vi.fn().mockReturnValue(4294967295);
      expect(calculator.getAssignmentBucket()).toBe(95);
    });
  });

  describe('#getSortedVariants()', () => {
    it('sorts variants alphabetically', () => {
      expect(calculator.getSortedVariants()).toEqual(['extraGiant', 'giant', 'huge', 'leetle', 'miniscule', 'teeny']);
    });
  });

  describe('#getWeighting()', () => {
    it('throws when given an unknown splitName', () => {
      calculatorOptions.splitName = 'nonExistentSplit';
      const localCalculator = createCalculator();

      expect(() => localCalculator.getVariant()).toThrow('Unknown split: "nonExistentSplit"');
    });

    it('logs an error when given an unknown splitName', () => {
      calculatorOptions.splitName = 'nonExistentSplit';
      const localCalculator = createCalculator();

      try {
        localCalculator.getVariant();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // ignore
      }

      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith('Unknown split: "nonExistentSplit"');
    });

    it('returns the weighting for a split', () => {
      expect(calculator.getWeighting()).toEqual({
        extraGiant: 0,
        giant: 80,
        huge: 1,
        leetle: 0,
        miniscule: 19,
        teeny: 0
      });
    });
  });

  describe('#getVariant()', () => {
    it('returns the first variant with non-zero weight from bucket 0', () => {
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(0);
      expect(calculator.getVariant()).toBe('giant');
    });

    it('returns the last variant with non-zero weight from bucket 99', () => {
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(99);
      expect(calculator.getVariant()).toBe('miniscule');
    });

    it('returns the correct 1%-wide variant', () => {
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(80);
      expect(calculator.getVariant()).toBe('huge');
    });

    it('returns null if there is no split registry', () => {
      vi.mocked(config.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      expect(calculator.getVariant()).toBeNull();
    });

    it('throws an error with an incomplete weighting', () => {
      config.getSplitRegistry = mockSplitRegistry({
        invalidWeighting: {
          yes: 33,
          no: 33,
          maybe: 33
        }
      });

      calculatorOptions.splitName = 'invalidWeighting';
      const localCalculator = createCalculator();
      localCalculator.getAssignmentBucket = vi.fn().mockReturnValue(99);

      expect(() => localCalculator.getVariant()).toThrow(
        'Assignment bucket out of range. 99 unmatched in invalidWeighting: {"yes":33,"no":33,"maybe":33}'
      );
    });
  });
});
