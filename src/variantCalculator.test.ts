import SplitRegistry from './splitRegistry';
import VariantCalculator, { type VariantCalculatorOptions } from './variantCalculator';
import Visitor from './visitor';
import { createSplitRegistry, createConfig } from './test-utils';
import type { Config } from './testTrackConfig';

function setupCalculator() {
  const config = createConfig();
  const visitor = new Visitor({
    config,
    id: '00000000-0000-0000-0000-000000000000',
    assignments: []
  });
  visitor.logError = vi.fn();

  const calculatorOptions: VariantCalculatorOptions = {
    visitor: visitor,
    splitName: 'logoSize'
  };

  const calculator = new VariantCalculator(calculatorOptions);

  vi.spyOn(config, 'getSplitRegistry').mockReturnValue(
    createSplitRegistry({
      logoSize: { extraGiant: 0, giant: 80, huge: 1, leetle: 0, miniscule: 19, teeny: 0 }
    })
  );

  return { config, visitor, calculator, calculatorOptions };
}

describe('VariantCalculator', () => {

  it('requires a visitor', () => {
    const { calculatorOptions } = setupCalculator();
    // @ts-expect-error Testing deletion of required property
    delete calculatorOptions.visitor;
    expect(() => new VariantCalculator(calculatorOptions)).toThrow('must provide visitor');
  });

  it('requires a splitName', () => {
    const { calculatorOptions } = setupCalculator();
    // @ts-expect-error Testing deletion of required property
    delete calculatorOptions.splitName;
    expect(() => new VariantCalculator(calculatorOptions)).toThrow('must provide splitName');
  });

  describe('#getSplitVisitorHash()', () => {
    it('calculates MD5 of splitName and visitorId', () => {
      const { calculator } = setupCalculator();
      // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
      expect(calculator.getSplitVisitorHash()).toBe('b72dca208c59ddeab8a1b9bc22f12224');
    });
  });

  describe('#getHashFixnum()', () => {
    it('converts 00000000deadbeef into 0', () => {
      const { calculator } = setupCalculator();
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('00000000deadbeef');
      expect(calculator.getHashFixnum()).toBe(0);
    });

    it('converts 0000000fdeadbeef into 15', () => {
      const { calculator } = setupCalculator();
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('0000000fdeadbeef');
      expect(calculator.getHashFixnum()).toBe(15);
    });

    it('converts ffffffffdeadbeef into 4294967295', () => {
      const { calculator } = setupCalculator();
      calculator.getSplitVisitorHash = vi.fn().mockReturnValue('ffffffffdeadbeef');
      expect(calculator.getHashFixnum()).toBe(4294967295);
    });
  });

  describe('#getAssignmentBucket()', () => {
    it('puts 0 in bucket 0', () => {
      const { calculator } = setupCalculator();
      calculator.getHashFixnum = vi.fn().mockReturnValue(0);
      expect(calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 99 in bucket 99', () => {
      const { calculator } = setupCalculator();
      calculator.getHashFixnum = vi.fn().mockReturnValue(99);
      expect(calculator.getAssignmentBucket()).toBe(99);
    });

    it('puts 100 in bucket 0', () => {
      const { calculator } = setupCalculator();
      calculator.getHashFixnum = vi.fn().mockReturnValue(100);
      expect(calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 4294967295 in bucket 95', () => {
      const { calculator } = setupCalculator();
      calculator.getHashFixnum = vi.fn().mockReturnValue(4294967295);
      expect(calculator.getAssignmentBucket()).toBe(95);
    });
  });

  describe('#getSortedVariants()', () => {
    it('sorts variants alphabetically', () => {
      const { calculator } = setupCalculator();
      expect(calculator.getSortedVariants()).toEqual(['extraGiant', 'giant', 'huge', 'leetle', 'miniscule', 'teeny']);
    });
  });

  describe('#getWeighting()', () => {
    it('throws when given an unknown splitName', () => {
      const { calculatorOptions } = setupCalculator();
      calculatorOptions.splitName = 'nonExistentSplit';
      const localCalculator = new VariantCalculator(calculatorOptions);

      expect(() => localCalculator.getVariant()).toThrow('Unknown split: "nonExistentSplit"');
    });

    it('logs an error when given an unknown splitName', () => {
      const { calculatorOptions, visitor } = setupCalculator();
      calculatorOptions.splitName = 'nonExistentSplit';
      const localCalculator = new VariantCalculator(calculatorOptions);

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
      const { calculator } = setupCalculator();
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
      const { calculator } = setupCalculator();
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(0);
      expect(calculator.getVariant()).toBe('giant');
    });

    it('returns the last variant with non-zero weight from bucket 99', () => {
      const { calculator } = setupCalculator();
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(99);
      expect(calculator.getVariant()).toBe('miniscule');
    });

    it('returns the correct 1%-wide variant', () => {
      const { calculator } = setupCalculator();
      calculator.getAssignmentBucket = vi.fn().mockReturnValue(80);
      expect(calculator.getVariant()).toBe('huge');
    });

    it('returns null if there is no split registry', () => {
      const { config, calculator } = setupCalculator();
      vi.mocked(config.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      expect(calculator.getVariant()).toBeNull();
    });

    it('throws an error with an incomplete weighting', () => {
      const { config, calculatorOptions } = setupCalculator();
      vi.spyOn(config, 'getSplitRegistry').mockReturnValue(
        createSplitRegistry({
          invalidWeighting: { yes: 33, no: 33, maybe: 33 }
        })
      );

      calculatorOptions.splitName = 'invalidWeighting';
      const localCalculator = new VariantCalculator(calculatorOptions);
      localCalculator.getAssignmentBucket = vi.fn().mockReturnValue(99);

      expect(() => localCalculator.getVariant()).toThrow(
        'Assignment bucket out of range. 99 unmatched in invalidWeighting: {"yes":33,"no":33,"maybe":33}'
      );
    });
  });
});
