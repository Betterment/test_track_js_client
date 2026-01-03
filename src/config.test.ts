import Assignment from './assignment';
import { loadConfig, type RawConfig } from './config';

const createConfig = (cookieName: string | undefined): RawConfig => ({
  url: 'http://testtrack.dev',
  cookieDomain: '.example.com',
  cookieName,
  experienceSamplingWeight: 1,
  assignments: { jabba: 'puppet', wine: 'rose' },
  splits: {
    jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
    wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
  }
});

describe('TestTrackConfig', () => {
  beforeEach(() => {
    window.TT = btoa(JSON.stringify(createConfig('custom_cookie_name')));
  });

  describe('.url', () => {
    it('is a URL', () => {
      expect(loadConfig().url).toEqual(new URL('http://testtrack.dev'));
    });
  });

  describe('.cookieDomain', () => {
    it('grabs the correct value', () => {
      expect(loadConfig().cookieDomain).toBe('.example.com');
    });
  });

  describe('.cookieName()', () => {
    describe('when there is a configured cookie name', () => {
      beforeEach(() => {
        window.TT = btoa(JSON.stringify(createConfig('custom_cookie_name')));
      });

      it('grabs the correct value', () => {
        expect(loadConfig().cookieName).toBe('custom_cookie_name');
      });
    });

    describe('when there is no configured cookie name', () => {
      beforeEach(() => {
        window.TT = btoa(JSON.stringify(createConfig(undefined)));
      });

      it('uses the default cookie name', () => {
        expect(loadConfig().cookieName).toBe('tt_visitor_id');
      });
    });
  });

  describe('.splitRegistry', () => {
    it('grabs the correct value', () => {
      const splitRegistry = loadConfig().splitRegistry;

      const jabba = splitRegistry.getSplit('jabba');
      expect(jabba!.getWeighting()).toEqual({ cgi: 50, puppet: 50 });
      expect(jabba!.isFeatureGate()).toEqual(true);

      const wine = splitRegistry.getSplit('wine');
      expect(wine!.getWeighting()).toEqual({ red: 50, white: 25, rose: 25 });
      expect(wine!.isFeatureGate()).toEqual(false);
    });
  });

  describe('.assignments', () => {
    it('grabs the correct value', () => {
      expect(loadConfig().assignments).toEqual([
        new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false }),
        new Assignment({ splitName: 'wine', variant: 'rose', isUnsynced: false })
      ]);
    });
  });

  describe('.experienceSamplingWeight', () => {
    it('returns the provided sampling weight', () => {
      expect(loadConfig().experienceSamplingWeight).toEqual(1);
    });
  });

  describe('when window.TT is not decodable', () => {
    beforeEach(() => {
      window.TT = 'someNonesense';
    });

    it('throws an error', () => {
      expect(() => loadConfig()).toThrow('Unable to parse configuration');
    });
  });
});
