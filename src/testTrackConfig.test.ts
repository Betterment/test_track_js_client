import Assignment from './assignment';
import TestTrackConfig, { type RawConfig } from './testTrackConfig';

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
    TestTrackConfig._clear();
    window.TT = btoa(JSON.stringify(createConfig('custom_cookie_name')));
  });

  describe('.getUrl()', () => {
    it('grabs the correct value', () => {
      expect(TestTrackConfig.getUrl()).toBe('http://testtrack.dev');
    });
  });

  describe('.getCookieDomain()', () => {
    it('grabs the correct value', () => {
      expect(TestTrackConfig.getCookieDomain()).toBe('.example.com');
    });
  });

  describe('.getCookieName()', () => {
    describe('when there is a configured cookie name', () => {
      beforeEach(() => {
        window.TT = btoa(JSON.stringify(createConfig('custom_cookie_name')));
      });

      it('grabs the correct value', () => {
        expect(TestTrackConfig.getCookieName()).toBe('custom_cookie_name');
      });
    });

    describe('when there is no configured cookie name', () => {
      beforeEach(() => {
        window.TT = btoa(JSON.stringify(createConfig(undefined)));
      });

      it('uses the default cookie name', () => {
        expect(TestTrackConfig.getCookieName()).toBe('tt_visitor_id');
      });
    });
  });

  describe('.getSplitRegistry()', () => {
    it('grabs the correct value', () => {
      const splitRegistry = TestTrackConfig.getSplitRegistry();

      const jabba = splitRegistry.getSplit('jabba');
      expect(jabba.getWeighting()).toEqual({ cgi: 50, puppet: 50 });
      expect(jabba.isFeatureGate()).toEqual(true);

      const wine = splitRegistry.getSplit('wine');
      expect(wine.getWeighting()).toEqual({ red: 50, white: 25, rose: 25 });
      expect(wine.isFeatureGate()).toEqual(false);
    });
  });

  describe('.getAssignments()', () => {
    it('grabs the correct value', () => {
      expect(TestTrackConfig.getAssignments()).toEqual([
        new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false }),
        new Assignment({ splitName: 'wine', variant: 'rose', isUnsynced: false })
      ]);
    });
  });

  describe('.getExperienceSamplingWeight()', () => {
    it('returns the provided sampling weight', () => {
      expect(TestTrackConfig.getExperienceSamplingWeight()).toEqual(1);
    });
  });

  describe('when window.TT is not decodable', () => {
    beforeEach(() => {
      window.TT = 'someNonesense';
    });

    it('throws an error', () => {
      expect(() => TestTrackConfig.getUrl()).toThrow('The string to be decoded is not correctly encoded');
    });
  });
});
