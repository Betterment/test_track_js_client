import Cookies from 'js-cookie';
import { createSession } from './session';
import { TestTrack } from './testTrack';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Config } from './config';
import { v4 as uuid } from 'uuid';

const rawConfig: Config = {
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

vi.mock('js-cookie');
vi.mock('uuid');

describe('createSession', () => {
  beforeAll(() => {
    window.TT = btoa(JSON.stringify(rawConfig));
  });

  beforeEach(() => {
    // @ts-expect-error Cookies.get returns different types depending on arguments
    vi.mocked(Cookies.get).mockReturnValue('existing_visitor_id');
  });

  describe('Cookie behavior', () => {
    it('reads the visitor id from a cookie and sets it back in the cookie', async () => {
      await createSession().initialize();
      expect(Cookies.get).toHaveBeenCalledTimes(1);
      expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');
      expect(Cookies.set).toHaveBeenCalledTimes(1);
      expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'existing_visitor_id', {
        expires: 365,
        path: '/',
        domain: '.example.com'
      });
    });

    it('saves the visitor id in a cookie', async () => {
      // @ts-expect-error Cookies.get returns different types depending on arguments
      vi.mocked(Cookies.get).mockReturnValue(undefined);
      // @ts-expect-error uuid mock return type
      vi.mocked(uuid).mockReturnValue('generated_visitor_id');

      await createSession().initialize();
      expect(Cookies.get).toHaveBeenCalledTimes(1);
      expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');
      expect(Cookies.set).toHaveBeenCalledTimes(1);
      expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'generated_visitor_id', {
        expires: 365,
        path: '/',
        domain: '.example.com'
      });
    });
  });

  describe('#initialize()', () => {
    it('calls notifyUnsyncedAssignments when a visitor is loaded', async () => {
      const notifySpy = vi.spyOn(TestTrack.prototype, 'notifyUnsyncedAssignments');
      await createSession().initialize();
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });

    it('sets the analytics lib', async () => {
      const analytics: AnalyticsProvider = {
        trackAssignment: vi.fn(),
        identify: vi.fn(),
        alias: vi.fn()
      };

      const testTrack = await createSession().initialize({ analytics });
      expect(testTrack.analytics).toBe(analytics);
    });

    it('sets the error logger', async () => {
      const errorLogger = vi.fn();
      const testTrack = await createSession().initialize({ errorLogger: errorLogger });

      testTrack.logError('kaboom');
      expect(errorLogger).toHaveBeenCalledWith('kaboom');
    });
  });
});
