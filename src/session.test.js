import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import Cookies from 'js-cookie';
import Session from './session';
import TestTrackConfig from './testTrackConfig'; // eslint-disable-line no-unused-vars
import VaryDSL from './varyDSL'; // eslint-disable-line no-unused-vars
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
  let testContext;
  beforeEach(() => {
    testContext = {};
    Cookies.get.mockReturnValue('existing_visitor_id');
  });

  describe('initialize', () => {
    it('results in an rejected error when initialize is not called before other API methods', () => {
      const session = new Session().getPublicAPI();
      return expect(session.logIn()).rejects.toThrow();
    });
  });

  describe('Cookie behavior', () => {
    it('reads the visitor id from a cookie and sets it back in the cookie', () => {
      var v = new visitor.default({ id: 'existing_visitor_id', assignments: [] });
      visitor.default.loadVisitor = jest.fn().mockResolvedValue(v);

      return new Session()
        .getPublicAPI()
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
        });
    });

    it('saves the visitor id in a cookie', () => {
      Cookies.get.mockReturnValue(null);

      var v = new visitor.default({ id: 'generated_visitor_id', assignments: [] });
      visitor.default.loadVisitor = jest.fn().mockResolvedValue(v);

      return new Session()
        .getPublicAPI()
        .initialize()
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
    beforeEach(() => {
      testContext.jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        isUnsynced: false
      });

      testContext.visitor = new visitor.default({
        id: 'dummy_visitor_id',
        assignments: [testContext.jabbaAssignment]
      });

      testContext.visitor.analytics = {
        alias: jest.fn(),
        identify: jest.fn()
      };

      testContext.visitor.linkIdentifier = jest.fn().mockImplementation(() => {
        testContext.visitor.getId = jest.fn(() => 'other_visitor_id'); // mimic behavior of linkIdentifier that we care about
        return Promise.resolve();
      });

      visitor.default.loadVisitor = jest.fn().mockResolvedValue(testContext.visitor);

      testContext.session = new Session().getPublicAPI();
      return testContext.session.initialize().then(() => {
        Cookies.set.mockClear();
      });
    });

    describe('#initialize()', () => {
      it('calls notifyUnsyncedAssignments when a visitor is loaded', () => {
        testContext.visitor.notifyUnsyncedAssignments = jest.fn();
        return new Session()
          .getPublicAPI()
          .initialize()
          .then(() => {
            expect(testContext.visitor.notifyUnsyncedAssignments).toHaveBeenCalledTimes(1);
          });
      });

      it('sets the analytics lib', () => {
        var analytics = { track: '' };
        testContext.visitor.setAnalytics = jest.fn();

        return new Session()
          .getPublicAPI()
          .initialize({ analytics: analytics })
          .then(() => {
            expect(testContext.visitor.setAnalytics).toHaveBeenCalledTimes(1);
            expect(testContext.visitor.setAnalytics).toHaveBeenCalledTimes(1);
            expect(testContext.visitor.setAnalytics).toHaveBeenCalledWith(analytics);
          });
      });

      it('sets the error logger', () => {
        var errorLogger = function() {};
        testContext.visitor.setErrorLogger = jest.fn();

        return new Session()
          .getPublicAPI()
          .initialize({ errorLogger: errorLogger })
          .then(() => {
            expect(testContext.visitor.setErrorLogger).toHaveBeenCalledTimes(1);
            expect(testContext.visitor.setErrorLogger).toHaveBeenCalledWith(errorLogger);
          });
      });
    });

    describe('#logIn()', () => {
      it('updates the visitor id in the cookie', () => {
        return testContext.session.logIn('myappdb_user_id', 444).then(() => {
          expect(testContext.visitor.linkIdentifier).toHaveBeenCalledTimes(1);
          expect(testContext.visitor.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
          expect(Cookies.set).toHaveBeenCalledTimes(1);
          expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
            expires: 365,
            path: '/',
            domain: '.example.com'
          });
        });
      });

      it('calls analytics.identify with the resolved visitor id', () => {
        return testContext.session.logIn('myappdb_user_id', 444).then(() => {
          expect(testContext.visitor.analytics.identify).toHaveBeenCalledTimes(1);
          expect(testContext.visitor.analytics.identify).toHaveBeenCalledWith('other_visitor_id');
        });
      });
    });

    describe('#signUp()', () => {
      it('updates the visitor id in the cookie', () => {
        return testContext.session.signUp('myappdb_user_id', 444).then(() => {
          expect(testContext.visitor.linkIdentifier).toHaveBeenCalledTimes(1);
          expect(testContext.visitor.linkIdentifier).toHaveBeenCalledWith('myappdb_user_id', 444);
          expect(Cookies.set).toHaveBeenCalledTimes(1);
          expect(Cookies.set).toHaveBeenCalledWith('custom_cookie_name', 'other_visitor_id', {
            expires: 365,
            path: '/',
            domain: '.example.com'
          });
        });
      });

      it('calls analytics.alias with the resolved visitor id', () => {
        return testContext.session.signUp('myappdb_user_id', 444).then(() => {
          expect(testContext.visitor.analytics.alias).toHaveBeenCalledTimes(1);
          expect(testContext.visitor.analytics.alias).toHaveBeenCalledWith('other_visitor_id');
        });
      });
    });

    describe('#vary()', () => {
      it('calls the correct vary function for the given split', done => {
        testContext.session.vary('jabba', {
          context: 'spec',
          variants: {
            cgi() {
              done();
            },
            puppet() {
              throw new Error('we should never get here');
            }
          },
          defaultVariant: 'puppet'
        });
      });
    });

    describe('#ab()', () => {
      it('passes true or false into the callback', done => {
        testContext.session.ab('jabba', {
          context: 'spec',
          trueVariant: 'cgi',
          callback(cgi) {
            expect(cgi).toBe(true);
            done();
          }
        });
      });
    });

    describe('#getPublicAPI()', () => {
      beforeEach(() => {
        testContext.session = new Session();
        testContext.session.initialize();
        testContext.publicApi = testContext.session.getPublicAPI();
      });

      it('returns an object with a limited set of methods', () => {
        expect(testContext.publicApi).toEqual(
          expect.objectContaining({
            vary: expect.any(Function),
            ab: expect.any(Function),
            logIn: expect.any(Function),
            signUp: expect.any(Function),
            initialize: expect.any(Function)
          })
        );

        expect(testContext.publicApi._crx).toEqual(
          expect.objectContaining({
            loadInfo: expect.any(Function),
            persistAssignment: expect.any(Function)
          })
        );
      });

      describe('_crx', () => {
        describe('#persistAssignment()', () => {
          it('creates an AssignmentOverride and persists it', () => {
            AssignmentOverride.mockImplementation(() => {
              return {
                persistAssignment: jest.fn().mockResolvedValue()
              };
            });

            return testContext.publicApi._crx
              .persistAssignment('split', 'variant', 'the_username', 'the_password')
              .then(() => {
                expect(AssignmentOverride).toHaveBeenCalledTimes(1);
                expect(AssignmentOverride).toHaveBeenCalledWith({
                  visitor: testContext.visitor,
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
            return testContext.publicApi._crx.loadInfo().then(info => {
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

      describe('context of the public API methods', () => {
        beforeEach(() => {
          testContext.session.vary = jest.fn();
          testContext.session.ab = jest.fn();
          testContext.session.logIn = jest.fn();
          testContext.session.signUp = jest.fn();

          // pull a fresh instance of publicApi to pick up the stubbed methods
          testContext.publicApi = testContext.session.getPublicAPI();
        });

        it('runs #vary() in the context of the session', () => {
          testContext.publicApi.vary();
          expect(testContext.session.vary).toHaveBeenCalled();
        });

        it('runs #ab() in the context of the session', () => {
          testContext.publicApi.ab();
          expect(testContext.session.ab).toHaveBeenCalled();
        });

        it('runs #logIn() in the context of the session', () => {
          testContext.publicApi.logIn();
          expect(testContext.session.logIn).toHaveBeenCalled();
        });

        it('runs #signUp() in the context of the session', () => {
          testContext.publicApi.signUp();
          expect(testContext.session.signUp).toHaveBeenCalled();
        });
      });
    });
  });
});
