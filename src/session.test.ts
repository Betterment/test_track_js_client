import Cookies from 'js-cookie';
import { createSession, type Session } from './session';
import Visitor from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Config } from './config';
import { v4 as uuid } from 'uuid';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';

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
    // @ts-expect-error Cookies.get returns different types in practice
    vi.mocked(Cookies.get).mockReturnValue('existing_visitor_id');
  });

  describe('Cookie behavior', () => {
    it('reads the visitor id from a cookie and sets it back in the cookie', async () => {
      await createSession().initialize({});
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

      await createSession().initialize({});
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

  describe('with stubbed visitor and split registry', () => {
    let session: Session;

    beforeEach(async () => {
      window.TT = btoa(JSON.stringify(rawConfig));
      session = createSession();
      await session.initialize({});
      vi.mocked(Cookies.set).mockClear();
    });

    describe('#initialize()', () => {
      it('calls notifyUnsyncedAssignments when a visitor is loaded', async () => {
        const notifySpy = vi.spyOn(Visitor.prototype, 'notifyUnsyncedAssignments');
        await createSession().initialize({});
        expect(notifySpy).toHaveBeenCalledTimes(1);
      });

      it('sets the analytics lib', async () => {
        const analytics: AnalyticsProvider = {
          trackAssignment: vi.fn(),
          identify: vi.fn(),
          alias: vi.fn()
        };

        const setAnalyticsSpy = vi.spyOn(Visitor.prototype, 'setAnalytics');

        await createSession().initialize({ analytics });
        expect(setAnalyticsSpy).toHaveBeenCalledTimes(1);
        expect(setAnalyticsSpy).toHaveBeenCalledWith(analytics);
      });

      it('sets the error logger', async () => {
        const errorLogger = function () {};
        const setErrorLoggerSpy = vi.spyOn(Visitor.prototype, 'setErrorLogger');

        await createSession().initialize({ errorLogger: errorLogger });
        expect(setErrorLoggerSpy).toHaveBeenCalledTimes(1);
        expect(setErrorLoggerSpy).toHaveBeenCalledWith(errorLogger);
      });
    });

    describe('#logIn()', () => {
      beforeEach(() => {
        server.use(
          http.post('http://testtrack.dev/api/v1/identifier', () => {
            return HttpResponse.json({
              visitor: {
                id: 'other_visitor_id',
                assignments: []
              }
            });
          })
        );
      });

      it('updates the visitor id in the cookie', async () => {
        await session.logIn('myappdb_user_id', 444);
        expect(Cookies.set).toHaveBeenCalledTimes(1);
        expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
          expires: 365,
          path: '/',
          domain: '.example.com'
        });
      });

      it('calls analytics.identify with the resolved visitor id', async () => {
        const testSession = createSession();
        const visitor = await testSession.initialize({});
        const identifySpy = vi.spyOn(visitor.analytics, 'identify');

        await testSession.logIn('myappdb_user_id', 444);
        expect(identifySpy).toHaveBeenCalledTimes(1);
        expect(identifySpy).toHaveBeenCalledWith('other_visitor_id');
      });
    });

    describe('#signUp()', () => {
      beforeEach(() => {
        server.use(
          http.post('http://testtrack.dev/api/v1/identifier', () => {
            return HttpResponse.json({
              visitor: {
                id: 'other_visitor_id',
                assignments: []
              }
            });
          })
        );
      });

      it('updates the visitor id in the cookie', async () => {
        await session.signUp('myappdb_user_id', 444);
        expect(Cookies.set).toHaveBeenCalledTimes(1);
        expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
          expires: 365,
          path: '/',
          domain: '.example.com'
        });
      });

      it('calls analytics.alias with the resolved visitor id', async () => {
        const testSession = createSession();
        const visitor = await testSession.initialize({});
        const aliasSpy = vi.spyOn(visitor.analytics, 'alias');

        await testSession.signUp('myappdb_user_id', 444);
        expect(aliasSpy).toHaveBeenCalledTimes(1);
        expect(aliasSpy).toHaveBeenCalledWith('other_visitor_id');
      });
    });

    describe('#vary()', () => {
      it('calls the correct vary function for the given split', async () => {
        const mockCgi = vi.fn();
        const mockPuppet = vi.fn();

        await session.vary('jabba', {
          context: 'spec',
          variants: {
            cgi: mockCgi,
            puppet: mockPuppet
          },
          defaultVariant: 'puppet'
        });

        expect(mockPuppet).toHaveBeenCalled();
        expect(mockCgi).not.toHaveBeenCalled();
      });
    });

    describe('#ab()', () => {
      it('passes true or false into the callback', () => {
        session.ab('jabba', {
          context: 'spec',
          trueVariant: 'cgi',
          callback(cgi) {
            expect(cgi).toBe(false);
          }
        });
      });
    });

    it('returns an object with a limited set of methods', () => {
      expect(session).toEqual({
        vary: expect.any(Function),
        ab: expect.any(Function),
        logIn: expect.any(Function),
        signUp: expect.any(Function),
        initialize: expect.any(Function),
        _crx: {
          loadInfo: expect.any(Function),
          persistAssignment: expect.any(Function)
        }
      });
    });

    describe('_crx', () => {
      describe('#persistAssignment()', () => {
        beforeEach(() => {
          server.use(
            http.post('http://testtrack.dev/api/v1/assignment_override', () => {
              return HttpResponse.json(null, { status: 200 });
            })
          );
        });

        it('creates an assignment override on the test track server', async () => {
          await session._crx.persistAssignment('split', 'variant', 'the_username', 'the_password');
          expect(requests.length).toBe(1);
          expect(requests[0].url).toEqual('http://testtrack.dev/api/v1/assignment_override');
          expect(await requests[0].text()).toEqual(
            'visitor_id=existing_visitor_id&split_name=split&variant=variant&context=chrome_extension&mixpanel_result=success'
          );
          expect(requests[0].headers.get('authorization')).toEqual(`Basic ${btoa('the_username:the_password')}`);
        });

        it('logs an error on an error response', async () => {
          server.use(
            http.post('http://testtrack.dev/api/v1/assignment_override', () => {
              return HttpResponse.json(null, { status: 500 });
            })
          );

          const logErrorSpy = vi.spyOn(Visitor.prototype, 'logError');

          await session._crx.persistAssignment('split', 'variant', 'the_username', 'the_password');
          expect(logErrorSpy).toHaveBeenCalledTimes(1);
          expect(logErrorSpy).toHaveBeenCalledWith(
            'test_track persistAssignment error: Error: HTTP request failed with 500 status'
          );
        });

        it('logs an error on a network error', async () => {
          server.use(
            http.post('http://testtrack.dev/api/v1/assignment_override', () => {
              return HttpResponse.error();
            })
          );

          const logErrorSpy = vi.spyOn(Visitor.prototype, 'logError');

          await session._crx.persistAssignment('split', 'variant', 'the_username', 'the_password');
          expect(logErrorSpy).toHaveBeenCalledTimes(1);
          expect(logErrorSpy).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
        });
      });

      describe('#loadInfo()', () => {
        it('returns a promise that resolves with the split registry, assignment registry and visitor id', async () => {
          const info = await session._crx.loadInfo();
          expect(info.visitorId).toEqual('existing_visitor_id');
          expect(info.splitRegistry).toEqual({
            jabba: { cgi: 50, puppet: 50 },
            wine: { red: 50, white: 25, rose: 25 }
          });
          expect(info.assignmentRegistry).toEqual({ jabba: 'puppet', wine: 'rose' });
        });
      });
    });
  });
});
