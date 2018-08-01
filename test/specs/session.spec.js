import Assignment from '../../src/assignment';
import Session from '../../src/session';
import TestTrackConfig from '../../src/testTrackConfig';
import VaryDSL from '../../src/varyDSL';
import Visitor from '../../src/visitor';
import $ from 'jquery';

jest.mock('../../src/testTrackConfig', () => {
    return {
        getCookieDomain: jest.fn(),
        getCookieName: jest.fn()
    };
});

jest.mock('../../src/visitor');

describe('Session', () => {
    let testContext;
    beforeEach(() => {
        testContext = {};
        TestTrackConfig.getCookieDomain.mockReturnValue('.example.com');
        TestTrackConfig.getCookieName.mockReturnValue('custom_cookie_name');

        $.cookie = jest.fn().mockReturnValue('existing_visitor_id');
    });

    describe('Cookie behavior', () => {
        test('reads the visitor id from a cookie and sets it back in the cookie', done => {
            var visitor = new Visitor();
            visitor.getId = jest.fn().mockReturnValue('existing_visitor_id');

            Visitor.loadVisitor = jest.fn().mockReturnValue($.Deferred().resolve(visitor).promise());

            new Session().getPublicAPI().initialize().then(function() {
                expect(Visitor.loadVisitor).toHaveBeenCalledWith('existing_visitor_id');

                expect($.cookie).toHaveBeenCalledTimes(2);
                expect($.cookie).toHaveBeenNthCalledWith(1, 'custom_cookie_name');

                expect($.cookie).toHaveBeenNthCalledWith(2, 'custom_cookie_name', 'existing_visitor_id', {
                    expires: 365,
                    path: '/',
                    domain: '.example.com'
                });

                done();
            });
        });

        test.only('saves the visitor id in a cookie', done => {
            $.cookie = jest.fn().mockReturnValue(null);

            var visitor = new Visitor();
            visitor.getId = jest.fn().mockReturnValue('generated_visitor_id');

            Visitor.loadVisitor = jest.fn().mockReturnValue($.Deferred().resolve(visitor).promise());

            new Session().getPublicAPI().initialize().then(function() {
                expect(Visitor.loadVisitor).toHaveBeenCalledWith(null);

                expect($.cookie).toHaveBeenCalledTimes(2);
                expect($.cookie).toHaveBeenNthCalledWith(1, 'custom_cookie_name');

                expect($.cookie).toHaveBeenNthCalledWith(2, 'custom_cookie_name', 'generated_visitor_id', {
                    expires: 365,
                    path: '/',
                    domain: '.example.com'
                });

                done()
            });
        });
    });

    describe('with stubbed visitor and split registry', () => {
        beforeEach(() => {
            sinon.stub(TestTrackConfig, 'getSplitRegistry').returns({
                jabba: { cgi: 50, puppet: 50 }
            });

            testContext.jabbaAssignment = new Assignment({
                splitName: 'jabba',
                variant: 'cgi',
                isUnsynced: false
            });

            testContext.visitor = new Visitor({
                id: 'dummy_visitor_id',
                assignments: [testContext.jabbaAssignment]
            });

            testContext.analyticsAliasStub = sinon.stub();
            testContext.analyticsIdentifyStub = sinon.stub();
            testContext.visitor.setAnalytics({
                alias: testContext.analyticsAliasStub,
                identify: testContext.analyticsIdentifyStub
            })

            sinon.stub(testContext.visitor, 'setAnalytics');
            sinon.stub(testContext.visitor, 'setErrorLogger');
            sinon.stub(testContext.visitor, 'linkIdentifier').callsFake(function() {
                testContext.visitor._id = 'other_visitor_id'; // mimic behavior of linkIdentifier that we care about
                return $.Deferred().resolve().promise();
            }.bind(this));

            sinon.stub(Visitor, 'loadVisitor').returns($.Deferred().resolve(testContext.visitor).promise());

            testContext.session = new Session().getPublicAPI();
            return testContext.session.initialize();
        });

        describe('#initialize()', () => {
            test(
                'calls notifyUnsyncedAssignments when a visitor is loaded',
                done => {
                    sinon.stub(testContext.visitor, 'notifyUnsyncedAssignments');
                    new Session().getPublicAPI().initialize().then(function() {
                        expect(testContext.visitor.notifyUnsyncedAssignments).to.be.calledOnce;

                        done();
                    }.bind(this));
                }
            );

            test('sets the analytics lib', done => {
                var analytics = {track: ''};

                new Session().getPublicAPI().initialize({analytics: analytics}).then(function() {
                    expect(testContext.visitor.setAnalytics).to.be.calledOnce;
                    expect(testContext.visitor.setAnalytics).to.be.calledWithExactly(analytics);

                    done();
                }.bind(this));
            });

            test('sets the error logger', done => {
                var errorLogger = function() { };

                new Session().getPublicAPI().initialize({errorLogger: errorLogger}).then(function() {
                    expect(testContext.visitor.setErrorLogger).to.be.calledOnce;
                    expect(testContext.visitor.setErrorLogger).to.be.calledWithExactly(errorLogger);

                    done();
                }.bind(this));
            });
        });

        describe('#logIn()', () => {
            test('updates the visitor id in the cookie', done => {
                var cookieStub = sinon.stub($, 'cookie');

                testContext.session.logIn('myappdb_user_id', 444).then(function() {
                    expect(testContext.visitor.linkIdentifier).to.be.calledOnce;
                    expect(testContext.visitor.linkIdentifier).to.be.calledWithExactly('myappdb_user_id', 444);
                    expect(cookieStub).to.be.calledOnce;
                    expect(cookieStub).to.be.calledWithExactly('custom_cookie_name', 'other_visitor_id', {
                        expires: 365,
                        path: '/',
                        domain: '.example.com'
                    });
                    done();
                }.bind(this));
            });

            test('calls analytics.identify with the resolved visitor id', done => {
                var self = this;
                testContext.session.logIn('myappdb_user_id', 444).then(function() {
                    expect(self.analyticsIdentifyStub).to.be.calledOnce;
                    expect(self.analyticsIdentifyStub).to.be.calledWithExactly('other_visitor_id');
                    done();
                });
            });
        });

        describe('#signUp()', () => {
            test('updates the visitor id in the cookie', done => {
                var cookieStub = sinon.stub($, 'cookie');

                testContext.session.signUp('myappdb_user_id', 444).then(function() {
                    expect(testContext.visitor.linkIdentifier).to.be.calledOnce;
                    expect(testContext.visitor.linkIdentifier).to.be.calledWithExactly('myappdb_user_id', 444);
                    expect(cookieStub).to.be.calledOnce;
                    expect(cookieStub).to.be.calledWithExactly('custom_cookie_name', 'other_visitor_id', {
                        expires: 365,
                        path: '/',
                        domain: '.example.com'
                    });
                    done();
                }.bind(this));
            });

            test('calls analytics.alias with the resolved visitor id', done => {
                var self = this;
                testContext.session.signUp('myappdb_user_id', 444).then(function() {
                    expect(self.analyticsAliasStub).to.be.calledOnce;
                    expect(self.analyticsAliasStub).to.be.calledWithExactly('other_visitor_id');
                    done();
                });
            });
        });

        describe('#vary()', () => {
            test('calls the correct vary function for the given split', done => {
                testContext.session.vary('jabba', {
                    context: 'spec',
                    variants: {
                        cgi: function() {
                            done();
                        },
                        puppet: function() {
                            throw new Error('we should never get here');
                        }
                    },
                    defaultVariant: 'puppet'
                });
            });
        });

        describe('#ab()', () => {
            test('passes true or false into the callback', done => {
                testContext.session.ab('jabba', {
                    context: 'spec',
                    trueVariant: 'cgi',
                    callback: function(cgi) {
                        expect(cgi).toBe(true);
                        done();
                    }
                });
            });
        });

        describe('#getPublicAPI()', () => {
            var session = new Session();

            test('returns an object with a limited set of methods', () => {
                expect(session.getPublicAPI()).toEqual(expect.arrayContaining([
                    'vary',
                    'ab',
                    'logIn',
                    'signUp',
                    'initialize',
                    '_crx'
                ]));

                expect(session.getPublicAPI()._crx).toEqual(expect.arrayContaining([
                    'loadInfo',
                    'persistAssignment'
                ]));
            });

            describe('_crx', () => {
                beforeEach(() => {
                    var session = new Session().getPublicAPI();
                    session.initialize();
                    testContext.crx = session._crx;
                });

                describe('#persistAssignment()', () => {
                    test('creates an AssignmentOverride and perists it', done => {
                        var persistAssignmentDeferred = $.Deferred(),
                            assignmentOverrideStub = sinon.stub(window, 'AssignmentOverride').returns({
                                persistAssignment: sinon.stub().returns(persistAssignmentDeferred.promise())
                            });

                        testContext.crx.persistAssignment('split', 'variant', 'the_username', 'the_password').then(function() {
                            expect(assignmentOverrideStub).to.be.calledOnce;
                            expect(assignmentOverrideStub).to.be.calledWithExactly({
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
                            done();
                        }.bind(this));

                        persistAssignmentDeferred.resolve();
                    });
                });

                describe('#loadInfo()', () => {
                    test(
                        'returns a promise that resolves with the split registry, assignment registry and visitor id',
                        done => {
                            testContext.crx.loadInfo().then(function(info) {
                                expect(info.visitorId).toBe('dummy_visitor_id');
                                expect(info.splitRegistry).toEqual({ jabba: { cgi: 50, puppet: 50 } });
                                expect(info.assignmentRegistry).toEqual({ jabba: 'cgi' });
                                done();
                            });
                        }
                    );
                });
            });

            describe('context of the public API methods', () => {

                beforeEach(() => {
                    testContext.varyStub = sinon.stub(testContext.session, 'vary');
                    testContext.abStub = sinon.stub(testContext.session, 'ab');
                    testContext.logInStub = sinon.stub(testContext.session, 'logIn');
                    testContext.signUpStub = sinon.stub(testContext.session, 'signUp');
                });

                test('runs #vary() in the context of the session', () => {
                    testContext.session.vary();
                    expect(testContext.varyStub.thisValues[0]).toBe(testContext.session);
                });

                test('runs #ab() in the context of the session', () => {
                    testContext.session.ab();
                    expect(testContext.abStub.thisValues[0]).toBe(testContext.session);
                });

                test('runs #logIn() in the context of the session', () => {
                    testContext.session.logIn();
                    expect(testContext.logInStub.thisValues[0]).toBe(testContext.session);
                });

                test('runs #signUp() in the context of the session', () => {
                    testContext.session.signUp();
                    expect(testContext.signUpStub.thisValues[0]).toBe(testContext.session);
                });
            });
        });
    });
});
