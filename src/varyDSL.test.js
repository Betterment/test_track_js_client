import Assignment from './assignment';
import TestTrackConfig from './testTrackConfig';
import VaryDSL from './varyDSL';
import Visitor from './visitor';

jest.mock('./testTrackConfig', () => {
  return {
    getSplitRegistry: jest.fn()
  };
});

describe('VaryDSL', () => {
  let testContext;
  beforeEach(() => {
    testContext = {};
    TestTrackConfig.getSplitRegistry.mockClear();
    TestTrackConfig.getSplitRegistry.mockReturnValue({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      }
    });

    testContext.assignment = new Assignment({
      splitName: 'element',
      variant: 'earth',
      isUnsynced: true
    });

    testContext.visitor = new Visitor({
      id: 'visitor_id',
      assignments: [testContext.assignment]
    });
    testContext.visitor.logError = jest.fn();

    testContext.vary = new VaryDSL({
      assignment: testContext.assignment,
      visitor: testContext.visitor
    });
  });

  it('requires an assignment', () => {
    expect(
      function() {
        new VaryDSL({
          visitor: testContext.visitor
        });
      }.bind(this)
    ).toThrow('must provide assignment');
  });

  it('requires a visitor', () => {
    expect(
      function() {
        new VaryDSL({
          assignment: testContext.assignment
        });
      }.bind(this)
    ).toThrow('must provide visitor');
  });

  describe('#when()', () => {
    it('throws an error if no variants are provided', () => {
      expect(
        function() {
          testContext.vary.when(function() {});
        }.bind(this)
      ).toThrow('must provide at least one variant');
    });

    it('throws an error if handler is not provided', () => {
      expect(
        function() {
          testContext.vary.when('earth');
        }.bind(this)
      ).toThrow('must provide handler for earth');
    });

    it('supports multiple variants', () => {
      var handler = function() {};
      testContext.vary.when('earth', 'wind', 'fire', handler);

      expect(testContext.vary._variantHandlers).toEqual({
        earth: handler,
        wind: handler,
        fire: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      var handler = function() {};
      testContext.vary.when('earth', 'wind', 'leeloo_multipass', handler);

      expect(testContext.vary._variantHandlers).toEqual({
        earth: handler,
        wind: handler,
        leeloo_multipass: handler
      });

      expect(testContext.visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is unavailable', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(null);

      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.when('earth', 'wind', 'leeloo_multipass', jest.fn());

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });

    it('does not log an error for a variant with a 0 weight', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue({
        element: {
          earth: 25,
          wind: 25,
          fire: 25,
          water: 25,
          leeloo_multipass: 0
        }
      });

      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.when('leeloo_multipass', function() {});

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#default()', () => {
    it('throws an error if handler is not provided', () => {
      expect(
        function() {
          testContext.vary.default('earth');
        }.bind(this)
      ).toThrow('must provide handler for earth');
    });

    it('throws an error if default is called more than once', () => {
      expect(
        function() {
          testContext.vary.default('fire', function() {});

          testContext.vary.default('water', function() {});
        }.bind(this)
      ).toThrow('must provide exactly one `default`');
    });

    it('sets the default variant', () => {
      testContext.vary.default('water', function() {});

      expect(testContext.vary.getDefaultVariant()).toBe('water');
    });

    it('adds the variant to the _variantHandlers object', () => {
      var handler = function() {};
      testContext.vary.default('water', handler);
      expect(testContext.vary._variantHandlers).toEqual({
        water: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      var handler = function() {};

      testContext.vary.default('leeloo_multipass', handler);

      expect(testContext.vary._variantHandlers).toEqual({
        leeloo_multipass: handler
      });

      expect(testContext.visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is unavailable', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(null);

      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.default('leeloo_multipass', function() {});

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });

    it('does not log an error for a variant with a 0 weight', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue({
        element: {
          earth: 25,
          wind: 25,
          fire: 25,
          water: 25,
          leeloo_multipass: 0
        }
      });

      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.default('leeloo_multipass', function() {});

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#run()', () => {
    beforeEach(() => {
      testContext.whenHandler = jest.fn();
      testContext.defaultHandler = jest.fn();
    });

    it('throws an error if `default` was never called', () => {
      expect(
        function() {
          testContext.vary.run();
        }.bind(this)
      ).toThrow('must provide exactly one `default`');
    });

    it('throws an error if `when` was never called', () => {
      expect(
        function() {
          testContext.vary.default('water', function() {});

          testContext.vary.run();
        }.bind(this)
      ).toThrow('must provide at least one `when`');
    });

    it('runs the handler of the assigned variant', () => {
      testContext.vary.when('earth', testContext.whenHandler);
      testContext.vary.default('water', testContext.defaultHandler);

      testContext.vary.run();

      expect(testContext.whenHandler).toHaveBeenCalled();
      expect(testContext.defaultHandler).not.toHaveBeenCalled();
    });

    it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.when('fire', testContext.whenHandler);
      vary.default('water', testContext.defaultHandler);

      vary.run();

      expect(testContext.defaultHandler).toHaveBeenCalled();
      expect(testContext.whenHandler).not.toHaveBeenCalled();
      expect(vary.isDefaulted()).toBe(true);
    });

    it('is not defaulted if the assigned variant is represented as the default', () => {
      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.when('water', testContext.whenHandler);
      vary.default('earth', testContext.defaultHandler);

      vary.run();

      expect(testContext.defaultHandler).toHaveBeenCalled();
      expect(testContext.whenHandler).not.toHaveBeenCalled();
      expect(vary.isDefaulted()).toBe(false);
    });

    it('logs an error if not all variants are represented', () => {
      testContext.vary.when('earth', testContext.whenHandler);
      testContext.vary.default('fire', testContext.defaultHandler);

      testContext.vary.run();

      expect(testContext.visitor.logError).toHaveBeenCalledWith('does not configure variants wind and water');
    });

    it('does not log an error when the split registry is unavailable', () => {
      TestTrackConfig.getSplitRegistry.mockReturnValue(null);

      var vary = new VaryDSL({
        assignment: testContext.assignment,
        visitor: testContext.visitor
      });

      vary.when('earth', testContext.whenHandler);
      vary.default('fire', testContext.defaultHandler);

      vary.run();

      expect(testContext.visitor.logError).not.toHaveBeenCalled();
    });
  });
});
