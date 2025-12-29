import SplitRegistry from './splitRegistry';
import TestTrackConfig from './testTrackConfig';
import VariantCalculator from './variantCalculator';
import Visitor from './visitor';
import { mockSplitRegistry } from './test-utils';

jest.mock('./testTrackConfig');

type TestContext = {
  visitor: Visitor;
  calculator: VariantCalculator;
};

describe('VariantCalculator', () => {
  let calculatorOptions;
  function createCalculator() {
    return new VariantCalculator(calculatorOptions);
  }

  let testContext: TestContext;
  beforeEach(() => {
    testContext = {} as TestContext;
    testContext.visitor = new Visitor({
      id: '00000000-0000-0000-0000-000000000000',
      assignments: []
    });
    testContext.visitor.logError = jest.fn();

    calculatorOptions = {
      visitor: testContext.visitor,
      splitName: 'logoSize'
    };

    testContext.calculator = createCalculator();

    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
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
    expect(function() {
      delete calculatorOptions.visitor;
      createCalculator();
    }).toThrow('must provide visitor');
  });

  it('requires a splitName', () => {
    expect(function() {
      delete calculatorOptions.splitName;
      createCalculator();
    }).toThrow('must provide splitName');
  });

  describe('#getSplitVisitorHash()', () => {
    it('calculates MD5 of splitName and visitorId', () => {
      // md5('logoSize00000000-0000-0000-0000-000000000000') => 'b72dca208c59ddeab8a1b9bc22f12224'
      expect(testContext.calculator.getSplitVisitorHash()).toBe('b72dca208c59ddeab8a1b9bc22f12224');
    });
  });

  describe('#getHashFixnum()', () => {
    it('converts 00000000deadbeef into 0', () => {
      testContext.calculator.getSplitVisitorHash = jest.fn().mockReturnValue('00000000deadbeef');
      expect(testContext.calculator.getHashFixnum()).toBe(0);
    });

    it('converts 0000000fdeadbeef into 15', () => {
      testContext.calculator.getSplitVisitorHash = jest.fn().mockReturnValue('0000000fdeadbeef');
      expect(testContext.calculator.getHashFixnum()).toBe(15);
    });

    it('converts ffffffffdeadbeef into 4294967295', () => {
      testContext.calculator.getSplitVisitorHash = jest.fn().mockReturnValue('ffffffffdeadbeef');
      expect(testContext.calculator.getHashFixnum()).toBe(4294967295);
    });
  });

  describe('#getAssignmentBucket()', () => {
    it('puts 0 in bucket 0', () => {
      testContext.calculator.getHashFixnum = jest.fn().mockReturnValue(0);
      expect(testContext.calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 99 in bucket 99', () => {
      testContext.calculator.getHashFixnum = jest.fn().mockReturnValue(99);
      expect(testContext.calculator.getAssignmentBucket()).toBe(99);
    });

    it('puts 100 in bucket 0', () => {
      testContext.calculator.getHashFixnum = jest.fn().mockReturnValue(100);
      expect(testContext.calculator.getAssignmentBucket()).toBe(0);
    });

    it('puts 4294967295 in bucket 95', () => {
      testContext.calculator.getHashFixnum = jest.fn().mockReturnValue(4294967295);
      expect(testContext.calculator.getAssignmentBucket()).toBe(95);
    });
  });

  describe('#getSortedVariants()', () => {
    it('sorts variants alphabetically', () => {
      expect(testContext.calculator.getSortedVariants()).toEqual([
        'extraGiant',
        'giant',
        'huge',
        'leetle',
        'miniscule',
        'teeny'
      ]);
    });
  });

  describe('#getWeighting()', () => {
    it('throws when given an unknown splitName', () => {
      calculatorOptions.splitName = 'nonExistentSplit';
      var calculator = createCalculator();

      expect(function() {
        calculator.getVariant();
      }).toThrow('Unknown split: "nonExistentSplit"');
    });

    it('logs an error when given an unknown splitName', () => {
      calculatorOptions.splitName = 'nonExistentSplit';
      var calculator = createCalculator();

      try {
        calculator.getVariant();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // ignore
      }

      expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
      expect(testContext.visitor.logError).toHaveBeenCalledWith('Unknown split: "nonExistentSplit"');
    });

    it('returns the weighting for a split', () => {
      expect(testContext.calculator.getWeighting()).toEqual({
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
      testContext.calculator.getAssignmentBucket = jest.fn().mockReturnValue(0);
      expect(testContext.calculator.getVariant()).toBe('giant');
    });

    it('returns the last variant with non-zero weight from bucket 99', () => {
      testContext.calculator.getAssignmentBucket = jest.fn().mockReturnValue(99);
      expect(testContext.calculator.getVariant()).toBe('miniscule');
    });

    it('returns the correct 1%-wide variant', () => {
      testContext.calculator.getAssignmentBucket = jest.fn().mockReturnValue(80);
      expect(testContext.calculator.getVariant()).toBe('huge');
    });

    it('returns null if there is no split registry', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

      expect(testContext.calculator.getVariant()).toBeNull();
    });

    it('throws an error with an incomplete weighting', () => {
      TestTrackConfig.getSplitRegistry = mockSplitRegistry({
        invalidWeighting: {
          yes: 33,
          no: 33,
          maybe: 33
        }
      });

      calculatorOptions.splitName = 'invalidWeighting';
      var calculator = createCalculator();
      calculator.getAssignmentBucket = jest.fn().mockReturnValue(99);

      expect(function() {
        calculator.getVariant();
      }).toThrow('Assignment bucket out of range. 99 unmatched in invalidWeighting: {"yes":33,"no":33,"maybe":33}');
    });
  });
});
