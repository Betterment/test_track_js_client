import Assignment from './assignment';
import SplitRegistry from './splitRegistry';
import TestTrackConfig from './testTrackConfig';
import VaryDSL from './varyDSL';
import Visitor from './visitor';
import { mockSplitRegistry } from './test-utils';

jest.mock('./testTrackConfig');

describe('VaryDSL', () => {
  let assignment: Assignment;
  let visitor: Visitor;
  let vary: VaryDSL;

  beforeEach(() => {
    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      }
    });

    assignment = new Assignment({
      splitName: 'element',
      variant: 'earth',
      isUnsynced: true
    });

    visitor = new Visitor({
      id: 'visitor_id',
      assignments: [assignment]
    });
    visitor.logError = jest.fn();

    vary = new VaryDSL({
      assignment: assignment,
      visitor: visitor
    });
  });

  it('requires an assignment', () => {
    expect(
      function() {
        new VaryDSL({
          visitor: visitor
        });
      }.bind(this)
    ).toThrow('must provide assignment');
  });

  it('requires a visitor', () => {
    expect(
      function() {
        new VaryDSL({
          assignment: assignment
        });
      }.bind(this)
    ).toThrow('must provide visitor');
  });

  describe('#when()', () => {
    it('throws an error if no variants are provided', () => {
      expect(
        function() {
          vary.when(function() {});
        }.bind(this)
      ).toThrow('must provide at least one variant');
    });

    it('throws an error if handler is not provided', () => {
      expect(
        function() {
          vary.when('earth');
        }.bind(this)
      ).toThrow('must provide handler for earth');
    });

    it('supports multiple variants', () => {
      var handler = function() {};
      vary.when('earth', 'wind', 'fire', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        earth: handler,
        wind: handler,
        fire: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      var handler = function() {};
      vary.when('earth', 'wind', 'leeloo_multipass', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        earth: handler,
        wind: handler,
        leeloo_multipass: handler
      });

      expect(visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is not loaded', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.when('earth', 'wind', 'leeloo_multipass', jest.fn());

      expect(visitor.logError).not.toHaveBeenCalled();
    });

    it('does not log an error for a variant with a 0 weight', () => {
      TestTrackConfig.getSplitRegistry = mockSplitRegistry({
        element: {
          earth: 25,
          wind: 25,
          fire: 25,
          water: 25,
          leeloo_multipass: 0
        }
      });

      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.when('leeloo_multipass', function() {});

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#default()', () => {
    it('throws an error if handler is not provided', () => {
      expect(
        function() {
          vary.default('earth');
        }.bind(this)
      ).toThrow('must provide handler for earth');
    });

    it('throws an error if default is called more than once', () => {
      expect(
        function() {
          vary.default('fire', function() {});

          vary.default('water', function() {});
        }.bind(this)
      ).toThrow('must provide exactly one `default`');
    });

    it('sets the default variant', () => {
      vary.default('water', function() {});

      expect(vary.getDefaultVariant()).toBe('water');
    });

    it('adds the variant to the _variantHandlers object', () => {
      var handler = function() {};
      vary.default('water', handler);
      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        water: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      var handler = function() {};

      vary.default('leeloo_multipass', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        leeloo_multipass: handler
      });

      expect(visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is not loaded', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.default('leeloo_multipass', function() {});

      expect(visitor.logError).not.toHaveBeenCalled();
    });

    it('does not log an error for a variant with a 0 weight', () => {
      TestTrackConfig.getSplitRegistry = mockSplitRegistry({
        element: {
          earth: 25,
          wind: 25,
          fire: 25,
          water: 25,
          leeloo_multipass: 0
        }
      });

      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.default('leeloo_multipass', function() {});

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#run()', () => {
    let whenHandler: jest.Mock;
    let defaultHandler: jest.Mock;

    beforeEach(() => {
      whenHandler = jest.fn();
      defaultHandler = jest.fn();
    });

    it('throws an error if `default` was never called', () => {
      expect(
        function() {
          vary.run();
        }.bind(this)
      ).toThrow('must provide exactly one `default`');
    });

    it('throws an error if `when` was never called', () => {
      expect(
        function() {
          vary.default('water', function() {});

          vary.run();
        }.bind(this)
      ).toThrow('must provide at least one `when`');
    });

    it('runs the handler of the assigned variant', () => {
      vary.when('earth', whenHandler);
      vary.default('water', defaultHandler);

      vary.run();

      expect(whenHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.when('fire', whenHandler);
      localVary.default('water', defaultHandler);

      localVary.run();

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
      expect(localVary.isDefaulted()).toBe(true);
    });

    it('is not defaulted if the assigned variant is represented as the default', () => {
      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.when('water', whenHandler);
      localVary.default('earth', defaultHandler);

      localVary.run();

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
      expect(localVary.isDefaulted()).toBe(false);
    });

    it('logs an error if not all variants are represented', () => {
      vary.when('earth', whenHandler);
      vary.default('fire', defaultHandler);

      vary.run();

      expect(visitor.logError).toHaveBeenCalledWith('does not configure variants wind and water');
    });

    it('does not log an error when the split registry is not loaded', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(new SplitRegistry(null));

      var localVary = new VaryDSL({
        assignment: assignment,
        visitor: visitor
      });

      localVary.when('earth', whenHandler);
      localVary.default('fire', defaultHandler);

      localVary.run();

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });
});
