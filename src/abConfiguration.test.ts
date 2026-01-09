import { getFalseVariant } from './abConfiguration';
import { createSplitRegistry } from './splitRegistry';

const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  },
  {
    name: 'button_color',
    isFeatureGate: false,
    weighting: { red: 50, blue: 50 }
  },
  {
    name: 'new_feature',
    isFeatureGate: false,
    weighting: { true: 100 }
  }
]);

describe('getFalseVariant()', () => {
  it('logs an error if the split does not have exactly two variants', () => {
    const logError = vi.fn();

    getFalseVariant({
      splitName: 'element',
      trueVariant: 'water',
      logError,
      splitRegistry
    });

    expect(logError).toHaveBeenCalledWith('A/B for element configures split with more than 2 variants');
  });

  it('does not log an error if the split registry is not loaded', () => {
    const logError = vi.fn();

    getFalseVariant({
      splitName: 'element',
      trueVariant: 'water',
      logError,
      splitRegistry: emptySplitRegistry
    });

    expect(logError).not.toHaveBeenCalled();
  });

  it('returns the variant of the split that is not the true_variant', () => {
    const falseVariant = getFalseVariant({
      splitName: 'button_color',
      trueVariant: 'red',
      logError: vi.fn(),
      splitRegistry
    });

    expect(falseVariant).toBe('blue');
  });

  it('returns false when there is no split_registry', () => {
    const falseVariant = getFalseVariant({
      splitName: 'button_color',
      trueVariant: 'red',
      logError: vi.fn(),
      splitRegistry: emptySplitRegistry
    });

    expect(falseVariant).toBe('false');
  });

  it('returns the same variant if the split has more than two variants', () => {
    const falseVariant = getFalseVariant({
      splitName: 'element',
      trueVariant: 'earth',
      logError: vi.fn(),
      splitRegistry
    });

    expect(falseVariant).toBe('fire');
  });

  it('returns false if only one variant in the split', () => {
    const falseVariant = getFalseVariant({
      splitName: 'new_feature',
      trueVariant: 'true',
      logError: vi.fn(),
      splitRegistry
    });

    expect(falseVariant).toBe('false');
  });
});
