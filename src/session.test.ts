import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import Cookies from 'js-cookie';
import Session from './session';
import * as visitor from './visitor';

jest.mock('./assignmentOverride');

jest.mock('./configParser', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getConfig: () => {
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
    };
  });
});

jest.mock('js-cookie');

describe('Session', () => {
  beforeEach(() => {
    // @ts-expect-error Cookies.get returns different types in practice
    jest.mocked(Cookies.get).mockReturnValue('existing_visitor_id');
  });

  describe('Cookie behavior', () => {
    it('reads the visitor id from a cookie and sets it back in the cookie', () => {
      const v = new visitor.default({ id: 'existing_visitor_id', assignments: [] });
      visitor.default.loadVisitor = jest.fn().mockResolvedValue(v);

      return (
        new Session()
          .getPublicAPI()
          // @ts-expect-error Testing without arguments
          .initialize()
          .then(() => {
            expect(visitor.default.loadVisitor).toHaveBeenCalledWith('existing_visitor_id');

            expect(Cookies.get).toHaveBeenCalledTimes(1);
            expect(Cookies.get).toHaveBeenCalledWith('custom_cookie_name');

            expect(Cookies.set).toHaveBeenCalledTimes(1);
            expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'existing_visitor_id', {
              expires: 365,
              path: '/',
              domain: '.example.com'
            });
          })
      );
    });

    it('saves the visitor id in a cookie', () => {
      // @ts-expect-error Cookies.get returns different types depending on arguments
      jest.mocked(Cookies.get).mockReturnValue(null);

      const v = new visitor.default({ id: 'generated_visitor_id', assignments: [] });
      visitor.default.loadVisitor = jest.fn().mockResolvedValue(v);

      return new Session()
        .getPublicAPI()
        .initialize({})
        .then(() => {
          expect(visitor.default.loadVisitor).toHaveBeenCalledWith(null);

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
  });

  describe('with stubbed visitor and split registry', () => {
    let jabbaAssignment: Assignment;
    let visitorInstance: visitor.default;
    let session: Session;

    beforeEach(() => {
      jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        isUnsynced: false
      });

      visitorInstance = new visitor.default({
        id: 'dummy_visitor_id',
        assignments: [jabbaAssignment]
      });

      visitorInstance.analytics = {
        trackAssignment: jest.fn(),
        alias: jest.fn(),
        identify: jest.fn()
      };

      visitorInstance.linkIdentifier = jest.fn().mockImplementation(() => {
        visitorInstance.getId = jest.fn(() => 'other_visitor_id'); // mimic behavior of linkIdentifier that we care about
        return Promise.resolve();
      });

      visitor.default.loadVisitor = jest.fn().mockResolvedValue(visitorInstance);

      session = new Session();
      return session.initialize({}).then(() => {
        jest.mocked(Cookies.set).mockClear();
      });
    });

    describe('#initialize()', () => {
      it('calls notifyUnsyncedAssignments when a visitor is loaded', () => {
        visitorInstance.notifyUnsyncedAssignments = jest.fn();
        return (
          new Session()
            .getPublicAPI()
            // @ts-expect-error Testing without arguments
            .initialize()
            .then(() => {
              expect(visitorInstance.notifyUnsyncedAssignments).toHaveBeenCalledTimes(1);
            })
        );
      });

      it('sets the analytics lib', () => {
        const analytics = { track: '' };
        visitorInstance.setAnalytics = jest.fn();

        return (
          new Session()
            .getPublicAPI()
            // @ts-expect-error Testing with incomplete analytics object
            .initialize({ analytics: analytics })
            .then(() => {
              expect(visitorInstance.setAnalytics).toHaveBeenCalledTimes(1);
              expect(visitorInstance.setAnalytics).toHaveBeenCalledTimes(1);
              expect(visitorInstance.setAnalytics).toHaveBeenCalledWith(analytics);
            })
        );
      });

      it('sets the error logger', () => {
        const errorLogger = function() {};
        visitorInstance.setErrorLogger = jest.fn();

        return new Session()
          .getPublicAPI()
          .initialize({ errorLogger: errorLogger })
          .then(() => {
            expect(visitorInstance.setErrorLogger).toHaveBeenCalledTimes(1);
            expect(visitorInstance.setErrorLogger).toHaveBeenCalledWith(errorLogger);
          });
      });
    });

    describe('#logIn()', () => {
      it('updates the visitor id in the cookie', () => {
        return session.logIn('myappdb_user_id', 444).then(() => {
          expect(visitorInstance.linkIdentifier).toHaveBeenCalledTimes(1);
          expect(visitorInstance.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
          expect(Cookies.set).toHaveBeenCalledTimes(1);
          expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
            expires: 365,
            path: '/',
            domain: '.example.com'
          });
        });
      });

      it('calls analytics.identify with the resolved visitor id', () => {
        return session.logIn('myappdb_user_id', 444).then(() => {
          expect(visitorInstance.analytics.identify).toHaveBeenCalledTimes(1);
          expect(visitorInstance.analytics.identify).toHaveBeenCalledWith('other_visitor_id');
        });
      });
    });

    describe('#signUp()', () => {
      it('updates the visitor id in the cookie', () => {
        return session.signUp('myappdb_user_id', 444).then(() => {
          expect(visitorInstance.linkIdentifier).toHaveBeenCalledTimes(1);
          expect(visitorInstance.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
          expect(Cookies.set).toHaveBeenCalledTimes(1);
          expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
            expires: 365,
            path: '/',
            domain: '.example.com'
          });
        });
      });

      it('calls analytics.alias with the resolved visitor id', () => {
        return session.signUp('myappdb_user_id', 444).then(() => {
          expect(visitorInstance.analytics.alias).toHaveBeenCalledTimes(1);
          expect(visitorInstance.analytics.alias).toHaveBeenCalledWith('other_visitor_id');
        });
      });
    });

    describe('#vary()', () => {
      it('calls the correct vary function for the given split', async () => {
        const mockCgi = jest.fn();
        const mockPuppet = jest.fn();

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
          it('creates an AssignmentOverride and persists it', () => {
            // @ts-expect-error Testing with mock implementation
            jest.mocked(AssignmentOverride).mockImplementation(() => {
              return {
                // @ts-expect-error Testing without arguments
                persistAssignment: jest.fn().mockResolvedValue()
              };
            });

            return publicApi._crx.persistAssignment('split', 'variant', 'the_username', 'the_password').then(() => {
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
        });

        describe('#loadInfo()', () => {
          it('returns a promise that resolves with the split registry, assignment registry and visitor id', () => {
            return publicApi._crx.loadInfo().then(info => {
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
});
