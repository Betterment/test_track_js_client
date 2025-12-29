import ABConfiguration from './abConfiguration';
import SplitRegistry from './splitRegistry';
import TestTrackConfig from './testTrackConfig';
import Visitor from './visitor';
import { mockSplitRegistry } from './test-utils';

jest.mock('./testTrackConfig');

describe('ABConfiguration', () => {
  let visitor: Visitor;

  beforeEach(() => {
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
      },
      new_feature: {
        true: 100
      }
    });

    visitor = new Visitor({
      id: 'visitor_id',
      assignments: []
    });
    visitor.logError = jest.fn();
  });

  it('requires a splitName', () => {
    expect(
      function() {
        new ABConfiguration({
          trueVariant: 'red',
          visitor: visitor
        });
      }.bind(this)
    ).toThrow('must provide splitName');
  });

  it('requires an trueVariant', () => {
    expect(
      function() {
        new ABConfiguration({
          splitName: 'button_color',
          visitor: visitor
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
          visitor: visitor
        });
      }.bind(this)
    ).not.toThrow();
  });

  describe('#getVariants()', () => {
    it('logs an error if the split does not have exactly two variants', () => {
      var abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor: visitor
      });

      abConfiguration.getVariants();

      expect(visitor.logError).toHaveBeenCalledWith(
        'A/B for element configures split with more than 2 variants'
      );
    });

    it('does not log an error if the split registry is not loaded', () => {
      jest.mocked(TestTrackConfig.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      var abConfiguration = new ABConfiguration({
        splitName: 'element',
        trueVariant: 'water',
        visitor: visitor
      });

      abConfiguration.getVariants();

      expect(visitor.logError).not.toHaveBeenCalled();
    });

    describe('true variant', () => {
      it('is true if null was passed in during instantiation', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: null,
          visitor: visitor
        });

        expect(abConfiguration.getVariants().true).toBe('true');
      });

      it('is true if only one variant in the split', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'new_feature',
          trueVariant: null,
          visitor: visitor
        });

        expect(abConfiguration.getVariants().true).toBe('true');
      });

      it('is whatever was passed in during instantiation', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: visitor
        });

        expect(abConfiguration.getVariants().true).toBe('red');
      });
    });

    describe('false variant', () => {
      it('is the variant of the split that is not the true_variant', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: visitor
        });

        expect(abConfiguration.getVariants().false).toBe('blue');
      });

      it('is false when there is no split_registry', () => {
        jest.mocked(TestTrackConfig.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

        var abConfiguration = new ABConfiguration({
          splitName: 'button_color',
          trueVariant: 'red',
          visitor: visitor
        });

        expect(abConfiguration.getVariants().false).toBe('false');
      });

      it('is always the same if the split has more than two variants', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'element',
          trueVariant: 'earth',
          visitor: visitor
        });

        expect(abConfiguration.getVariants().false).toBe('fire');
      });

      it('is false if only one variant in the split', () => {
        var abConfiguration = new ABConfiguration({
          splitName: 'new_feature',
          trueVariant: null,
          visitor: visitor
        });

        expect(abConfiguration.getVariants().false).toBe('false');
      });
    });
  });
});
