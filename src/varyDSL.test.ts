import Assignment from './assignment';
import SplitRegistry from './splitRegistry';
import TestTrackConfig from './testTrackConfig';
import VaryDSL from './varyDSL';
import Visitor from './visitor';
import { mockSplitRegistry } from './test-utils';

vi.mock('./testTrackConfig');

function createAssignment() {
  return new Assignment({ splitName: 'element', variant: 'earth', isUnsynced: true });
}

function createVisitor() {
  const assignment = createAssignment();
  const visitor = new Visitor({ id: 'visitor_id', assignments: [assignment] });
  visitor.logError = vi.fn();
  return visitor;
}

describe('VaryDSL', () => {
  beforeEach(() => {
    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
      element: { earth: 25, wind: 25, fire: 25, water: 25 }
    });
  });

  it('requires an assignment', () => {
    const visitor = createVisitor();
    // @ts-expect-error Testing missing required property
    expect(() => new VaryDSL({ visitor })).toThrow('must provide assignment');
  });

  it('requires a visitor', () => {
    const assignment = createAssignment();
    // @ts-expect-error Testing missing required property
    expect(() => new VaryDSL({ assignment })).toThrow('must provide visitor');
  });

  describe('#when()', () => {
    it('throws an error if no variants are provided', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => {
        vary.when(function () {});
      }).toThrow('must provide at least one variant');
    });

    it('throws an error if handler is not provided', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => {
        vary.when('earth');
      }).toThrow('must provide handler for earth');
    });

    it('supports multiple variants', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });
      const handler = function () {};

      vary.when('earth', 'wind', 'fire', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        earth: handler,
        wind: handler,
        fire: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });
      const handler = () => {};

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
      vi.mocked(TestTrackConfig.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('earth', 'wind', 'leeloo_multipass', () => {});

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

      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('leeloo_multipass', function () {});

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#default()', () => {
    it('throws an error if handler is not provided', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => {
        // @ts-expect-error Testing missing required argument
        vary.default('earth');
      }).toThrow('must provide handler for earth');
    });

    it('throws an error if default is called more than once', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => {
        vary.default('fire', function () {});

        vary.default('water', function () {});
      }).toThrow('must provide exactly one `default`');
    });

    it('sets the default variant', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.default('water', function () {});

      expect(vary.getDefaultVariant()).toBe('water');
    });

    it('adds the variant to the _variantHandlers object', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });
      const handler = function () {};

      vary.default('water', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        water: handler
      });
    });

    it('logs an error if given a variant that is not in the split registry', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });
      const handler = function () {};

      vary.default('leeloo_multipass', handler);

      // @ts-expect-error Private property
      expect(vary._variantHandlers).toEqual({
        leeloo_multipass: handler
      });

      expect(visitor.logError).toHaveBeenCalledWith('configures unknown variant leeloo_multipass');
    });

    it('does not log an error when the split registry is not loaded', () => {
      vi.mocked(TestTrackConfig.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.default('leeloo_multipass', function () {});

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

      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.default('leeloo_multipass', function () {});

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });

  describe('#run()', () => {
    const whenHandler = vi.fn();
    const defaultHandler = vi.fn();

    it('throws an error if `default` was never called', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => vary.run()).toThrow('must provide exactly one `default`');
    });

    it('throws an error if `when` was never called', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      expect(() => {
        vary.default('water', function () {});

        vary.run();
      }).toThrow('must provide at least one `when`');
    });

    it('runs the handler of the assigned variant', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('earth', whenHandler);
      vary.default('water', defaultHandler);

      vary.run();

      expect(whenHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('runs the default handler and is defaulted if the assigned variant is not represented', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('fire', whenHandler);
      vary.default('water', defaultHandler);

      vary.run();

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
      expect(vary.isDefaulted()).toBe(true);
    });

    it('is not defaulted if the assigned variant is represented as the default', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('water', whenHandler);
      vary.default('earth', defaultHandler);

      vary.run();

      expect(defaultHandler).toHaveBeenCalled();
      expect(whenHandler).not.toHaveBeenCalled();
      expect(vary.isDefaulted()).toBe(false);
    });

    it('logs an error if not all variants are represented', () => {
      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('earth', whenHandler);
      vary.default('fire', defaultHandler);

      vary.run();

      expect(visitor.logError).toHaveBeenCalledWith('does not configure variants wind and water');
    });

    it('does not log an error when the split registry is not loaded', () => {
      vi.mocked(TestTrackConfig.getSplitRegistry).mockReturnValue(new SplitRegistry(null));

      const assignment = createAssignment();
      const visitor = createVisitor();
      const vary = new VaryDSL({ assignment, visitor });

      vary.when('earth', whenHandler);
      vary.default('fire', defaultHandler);

      vary.run();

      expect(visitor.logError).not.toHaveBeenCalled();
    });
  });
});
