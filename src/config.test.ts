import { loadConfig, parseAssignments, parseSplitRegistry, type Config } from './config';

const rawConfig: Config = {
  cookieDomain: '.example.com',
  cookieName: 'custom_cookie_name',
  experienceSamplingWeight: 1,
  assignments: { jabba: 'puppet', wine: 'rose' },
  splits: {
    jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
    wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
  }
};

describe('parseSplitRegistry', () => {
  it('parses splits into split registry', () => {
    const splitRegistry = parseSplitRegistry(rawConfig.splits);
    expect(splitRegistry.isLoaded).toBe(true);

    const jabba = splitRegistry.getSplit('jabba');
    expect(jabba!.weighting).toEqual({ cgi: 50, puppet: 50 });
    expect(jabba!.isFeatureGate).toBe(true);

    const wine = splitRegistry.getSplit('wine');
    expect(wine!.weighting).toEqual({ red: 50, white: 25, rose: 25 });
    expect(wine!.isFeatureGate).toBe(false);
  });

  it('creates empty split registry when no splits provided', () => {
    const splitRegistry = parseSplitRegistry(undefined);
    expect(splitRegistry.isLoaded).toBe(false);
  });
});

describe('parseAssignments', () => {
  it('parses assignments from object', () => {
    expect(parseAssignments(rawConfig.assignments)).toEqual([
      { splitName: 'jabba', variant: 'puppet', context: null },
      { splitName: 'wine', variant: 'rose', context: null }
    ]);
  });

  it('returns null when no assignments provided', () => {
    expect(parseAssignments(undefined)).toBeNull();
  });
});

describe('loadConfig', () => {
  it('loads and parses config from window.TT', () => {
    window.TT = btoa(JSON.stringify(rawConfig));
    expect(loadConfig()).toEqual(rawConfig);
  });

  it('throws error when window.TT is invalid', () => {
    window.TT = 'not-valid-base64-json';
    expect(() => loadConfig()).toThrow('Unable to parse configuration');

    window.TT = undefined;
    expect(() => loadConfig()).toThrow('Unable to parse configuration');
  });
});
