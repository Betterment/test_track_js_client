import ABConfiguration from './abConfiguration';
import Split from './split';
import SplitRegistry from './splitRegistry';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';
import { mockSplitRegistry } from './test-utils'

jest.mock('./testTrackConfig');

describe('ABConfiguration', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      },
      button_color: {
        red: 50,
        blue: 50
      }
    });

    testContext.visitor = new Visitor({
      id: 'visitor_id',
      assignments: []
    });
    testContext.visitor.logError = jest.fn();
  });

  it('requires a splitName', () => {
    expect(
      function() {
        new ABConfiguration({
          trueVariant: 'red',
          visitor: testContext.visitor
        });
      }.bind(this)
    ).toThrow('must provide splitName');
  });

  it('requires an trueVariant', () => {
    expect(
      function() {
        new ABConfiguration({
          splitName: 'button_color',
          visitor: testContext.visitor
        });
      }.bind(this)
    ).toThrow('must provide trueVariant');
  });

  it('requires a visitor', () => {
    expect(
      function() {
        new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red'
        });
      }.bind(this)
    ).toThrow('must provide visitor');
  });

  it('allows a null trueVariant', () => {
    expect(
      function() {
        new ABConfiguration({
          splitName: 'button_color',
          trueVariant: null,
          visitor: testContext.visitor
        });
      }.bind(this)
    ).not.toThrow();
  });

  describe('#getVariants()', () => {
    it('logs an error if the split does not have exactly two variants', () => {
      var abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor: testContext.visitor
      });

      abConfiguration.getVariants();

      expect(testContext.visitor.logError).toHaveBeenCalledWith(
        'A/B for element configures split with more than 2 variants'
      );
    });

    it('does not log an error if the split registry is unavailable', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

      var abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor: testContext.visitor
      });

      abConfiguration.getVariants();

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });

    describe('true variant', () => {
      it('is true if null was passed in during instantiation', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: null,
          visitor: testContext.visitor
        });

        expect(abConfiguration.getVariants().true).toBe(true);
      });

      it('is whatever was passed in during instantiation', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: testContext.visitor
        });

        expect(abConfiguration.getVariants().true).toBe('red');
      });
    });

    describe('false variant', () => {
      it('is the variant of the split that is not the true_variant', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: testContext.visitor
        });

        expect(abConfiguration.getVariants().false).toBe('blue');
      });

      it('is false when there is no split_registry', () => {
        TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: testContext.visitor
        });

        expect(abConfiguration.getVariants().false).toBe(false);
      });

      it('is always the same if the split has more than two variants', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'element',
          trueVariant: 'earth',
          visitor: testContext.visitor
        });

        expect(abConfiguration.getVariants().false).toBe('fire');
      });
    });
  });
});
