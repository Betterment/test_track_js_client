import { loadConfig, parseAssignments, parseSplitRegistry, type Config } from './config';

const config: Config = {
  url: 'http://testtrack.dev',
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
    const splitRegistry = parseSplitRegistry(config.splits);
    expect(splitRegistry.isLoaded).toBe(true);

    const jabba = splitRegistry.getSplit('jabba');
    expect(jabba!.weighting).toEqual({ cgi: 50, puppet: 50 });
    expect(jabba!.isFeatureGate).toBe(true);

    const wine = splitRegistry.getSplit('wine');
    expect(wine!.weighting).toEqual({ red: 50, white: 25, rose: 25 });
    expect(wine!.isFeatureGate).toBe(false);
  });

  it('creates empty split registry when no splits provided', () => {
    expect(parseSplitRegistry(undefined)).toHaveProperty('isLoaded', false);
    expect(parseSplitRegistry(null)).toHaveProperty('isLoaded', false);
  });
});

describe('parseAssignments', () => {
  it('parses assignments from object', () => {
    expect(parseAssignments(config.assignments)).toEqual([
      { splitName: 'jabba', variant: 'puppet', context: null },
      { splitName: 'wine', variant: 'rose', context: null }
    ]);
  });

  it('returns an empty array when assignments are missing', () => {
    expect(parseAssignments(undefined)).toEqual([]);
    expect(parseAssignments(null)).toEqual([]);
  });
});

describe('loadConfig', () => {
  it('loads and parses config from window.TT', () => {
    window.TT = btoa(JSON.stringify(config));
    expect(loadConfig()).toEqual(config);
  });

  it('throws error when window.TT is invalid', () => {
    window.TT = 'not-valid-base64-json';
    expect(() => loadConfig()).toThrow('Unable to parse configuration');

    window.TT = undefined;
    expect(() => loadConfig()).toThrow('Unable to parse configuration');
  });
});
