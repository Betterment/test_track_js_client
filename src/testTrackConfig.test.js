import Assignment from './assignment';
import ConfigParser from './configParser';
import TestTrackConfig from './testTrackConfig';

let mockCookieName;

jest.mock('./configParser', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getConfig: () => {
        return {
          url: 'http://testtrack.dev',
          cookieDomain: '.example.com',
          cookieName: mockCookieName,
          splits: {
            jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
            wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
          },
          assignments: {
            jabba: 'puppet',
            wine: 'rose'
          },
          experienceSamplingWeight: 1
        };
      }
    };
  });
});

describe('TestTrackConfig', () => {
  beforeEach(() => {
    ConfigParser.mockClear();
    TestTrackConfig._clear();
  });

  describe('.getUrl()', () => {
    it('grabs the correct value from the ConfigParser', () => {
      expect(TestTrackConfig.getUrl()).toBe('http://testtrack.dev');
    });
  });

  describe('.getCookieDomain()', () => {
    it('grabs the correct value from the ConfigParser', () => {
      expect(TestTrackConfig.getCookieDomain()).toBe('.example.com');
    });
  });

  describe('.getCookieName()', () => {
    describe('when there is a configured cookie name', () => {
      beforeEach(() => {
        mockCookieName = 'custom_cookie_name';
      });

      it('grabs the correct value from the ConfigParser', () => {
        expect(TestTrackConfig.getCookieName()).toBe('custom_cookie_name');
      });
    });

  describe('when there is no configured cookie name', () => {
    beforeEach(() => {
      mockCookieName = undefined;
    });

    it('uses the default cookie name', () => {
      expect(TestTrackConfig.getCookieName()).toBe('tt_visitor_id');
    });
  });

  describe('.getSplitRegistry()', () => {
    it('grabs the correct value from the ConfigParser', () => {
      let splitRegistry = TestTrackConfig.getSplitRegistry();

      let jabba = splitRegistry.getSplit('jabba');
      expect(jabba.getWeighting()).toEqual({ cgi: 50, puppet: 50 });
      expect(jabba.isFeatureGate()).toEqual(true);

      let wine = splitRegistry.getSplit('wine');
      expect(wine.getWeighting()).toEqual({ red: 50, white: 25, rose: 25 });
      expect(wine.isFeatureGate()).toEqual(false);
    });
  });

  describe('.getAssignments()', () => {
    it('grabs the correct value from the ConfigParser', () => {
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
});
