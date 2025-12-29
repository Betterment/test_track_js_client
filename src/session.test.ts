import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import Cookies from 'js-cookie';
import Session from './session';
import Visitor from './visitor';
import { AnalyticsProvider } from './analyticsProvider';

vi.mock('./assignmentOverride');

vi.mock('./configParser', () => {
  class MockConfigParser {
    getConfig() {
      return {
        url: 'http://testtrack.dev',
        cookieDomain: '.example.com',
        cookieName: 'custom_cookie_name',
        splits: {
          jabba: { weights: { cgi: 50, puppet: 50 }, feature_gate: true },
          wine: { weights: { red: 50, white: 25, rose: 25 }, feature_gate: false }
        },
        assignments: {
          jabba: 'puppet',
          wine: 'rose'
        }
      };
    }
  }

  return { default: MockConfigParser };
});

vi.mock('js-cookie');

describe('Session', () => {
  beforeEach(() => {
    // @ts-expect-error Cookies.get returns different types in practice
    vi.mocked(Cookies.get).mockReturnValue('existing_visitor_id');
  });

  describe('Cookie behavior', () => {
    it('reads the visitor id from a cookie and sets it back in the cookie', async () => {
      const v = new Visitor({ id: 'existing_visitor_id', assignments: [] });
      Visitor.loadVisitor = vi.fn().mockResolvedValue(v);

      await new Session().getPublicAPI().initialize({});
      expect(Visitor.loadVisitor).toHaveBeenCalledWith('existing_visitor_id');
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
      vi.mocked(Cookies.get).mockReturnValue(null);

      const v = new Visitor({ id: 'generated_visitor_id', assignments: [] });
      Visitor.loadVisitor = vi.fn().mockResolvedValue(v);

      await new Session().getPublicAPI().initialize({});
      expect(Visitor.loadVisitor).toHaveBeenCalledWith(null);
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
    let jabbaAssignment: Assignment;
    let visitorInstance: Visitor;
    let session: Session;

    beforeEach(async () => {
      jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        isUnsynced: false
      });

      visitorInstance = new Visitor({
        id: 'dummy_visitor_id',
        assignments: [jabbaAssignment]
      });

      visitorInstance.analytics = {
        trackAssignment: vi.fn(),
        alias: vi.fn(),
        identify: vi.fn()
      };

      visitorInstance.linkIdentifier = vi.fn().mockImplementation(() => {
        visitorInstance.getId = vi.fn(() => 'other_visitor_id'); // mimic behavior of linkIdentifier that we care about
        return Promise.resolve();
      });

      Visitor.loadVisitor = vi.fn().mockResolvedValue(visitorInstance);

      session = new Session();
      await session.initialize({});
      vi.mocked(Cookies.set).mockClear();
    });

    describe('#initialize()', () => {
      it('calls notifyUnsyncedAssignments when a visitor is loaded', async () => {
        visitorInstance.notifyUnsyncedAssignments = vi.fn();
        await new Session().getPublicAPI().initialize({});
        expect(visitorInstance.notifyUnsyncedAssignments).toHaveBeenCalledTimes(1);
      });

      it('sets the analytics lib', async () => {
        const analytics: AnalyticsProvider = {
          trackAssignment: vi.fn(),
          identify: vi.fn(),
          alias: vi.fn()
        };

        visitorInstance.setAnalytics = vi.fn();

        await new Session().getPublicAPI().initialize({ analytics });
        expect(visitorInstance.setAnalytics).toHaveBeenCalledTimes(1);
        expect(visitorInstance.setAnalytics).toHaveBeenCalledTimes(1);
        expect(visitorInstance.setAnalytics).toHaveBeenCalledWith(analytics);
      });

      it('sets the error logger', async () => {
        const errorLogger = function() {};
        visitorInstance.setErrorLogger = vi.fn();

        await new Session().getPublicAPI().initialize({ errorLogger: errorLogger });
        expect(visitorInstance.setErrorLogger).toHaveBeenCalledTimes(1);
        expect(visitorInstance.setErrorLogger).toHaveBeenCalledWith(errorLogger);
      });
    });

    describe('#logIn()', () => {
      it('updates the visitor id in the cookie', async () => {
        await session.logIn('myappdb_user_id', 444);
        expect(visitorInstance.linkIdentifier).toHaveBeenCalledTimes(1);
        expect(visitorInstance.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
        expect(Cookies.set).toHaveBeenCalledTimes(1);
        expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
          expires: 365,
          path: '/',
          domain: '.example.com'
        });
      });

      it('calls analytics.identify with the resolved visitor id', async () => {
        await session.logIn('myappdb_user_id', 444);
        expect(visitorInstance.analytics.identify).toHaveBeenCalledTimes(1);
        expect(visitorInstance.analytics.identify).toHaveBeenCalledWith('other_visitor_id');
      });
    });

    describe('#signUp()', () => {
      it('updates the visitor id in the cookie', async () => {
        await session.signUp('myappdb_user_id', 444);
        expect(visitorInstance.linkIdentifier).toHaveBeenCalledTimes(1);
        expect(visitorInstance.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
        expect(Cookies.set).toHaveBeenCalledTimes(1);
        expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
          expires: 365,
          path: '/',
          domain: '.example.com'
        });
      });

      it('calls analytics.alias with the resolved visitor id', async () => {
        await session.signUp('myappdb_user_id', 444);
        expect(visitorInstance.analytics.alias).toHaveBeenCalledTimes(1);
        expect(visitorInstance.analytics.alias).toHaveBeenCalledWith('other_visitor_id');
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

        expect(mockCgi).toHaveBeenCalled();
        expect(mockPuppet).not.toHaveBeenCalled();
      });
    });

    describe('#ab()', () => {
      it('passes true or false into the callback', () => {
        session.ab('jabba', {
          context: 'spec',
          trueVariant: 'cgi',
          callback(cgi) {
            expect(cgi).toBe(true);
          }
        });
      });
    });

    describe('#getPublicAPI()', () => {
      let publicApi: ReturnType<Session['getPublicAPI']>;

      beforeEach(() => {
        session = new Session();
        session.initialize({});
        publicApi = session.getPublicAPI();
      });

      it('returns an object with a limited set of methods', () => {
        expect(publicApi).toEqual(
          expect.objectContaining({
            vary: expect.any(Function),
            ab: expect.any(Function),
            logIn: expect.any(Function),
            signUp: expect.any(Function),
            initialize: expect.any(Function)
          })
        );

        expect(publicApi._crx).toEqual(
          expect.objectContaining({
            loadInfo: expect.any(Function),
            persistAssignment: expect.any(Function)
          })
        );
      });

      describe('_crx', () => {
        describe('#persistAssignment()', () => {
          it('creates an AssignmentOverride and persists it', async () => {
            vi.spyOn(AssignmentOverride.prototype, 'persistAssignment').mockResolvedValue();

            await publicApi._crx.persistAssignment('split', 'variant', 'the_username', 'the_password');
            expect(AssignmentOverride).toHaveBeenCalledTimes(1);
            expect(AssignmentOverride).toHaveBeenCalledWith({
              visitor: visitorInstance,
              username: 'the_username',
              password: 'the_password',
              assignment: new Assignment({
                splitName: 'split',
                variant: 'variant',
                context: 'chrome_extension',
                isUnsynced: true
              })
            });
          });
        });

        describe('#loadInfo()', () => {
          it('returns a promise that resolves with the split registry, assignment registry and visitor id', async () => {
            const info = await publicApi._crx.loadInfo();
            expect(info.visitorId).toEqual('dummy_visitor_id');
            expect(info.splitRegistry).toEqual({
              jabba: { cgi: 50, puppet: 50 },
              wine: { red: 50, white: 25, rose: 25 }
            });
            expect(info.assignmentRegistry).toEqual({ jabba: 'cgi' });
          });
        });
      });
    });
  });
});
