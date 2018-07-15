import Assignment from '../../src/assignment';
import Session from '../../src/session';
import TestTrackConfig from '../../src/testTrackConfig';
import VaryDSL from '../../src/varyDSL';
import Visitor from '../../src/visitor';

describe('Session', function() {
    afterEach(function() {
        sinon.restore();
        TestTrackConfig._clear();
    });

    beforeEach(function() {
        sinon.stub(TestTrackConfig, 'getCookieDomain').returns('.example.com');
        sinon.stub(TestTrackConfig, 'getCookieName').returns('custom_cookie_name');
    });

    describe('Cookie behavior', function() {
        it('reads the visitor id from a cookie and sets it back in the cookie', function(done) {
            var visitor = new Visitor({
                    id: 'existing_visitor_id',
                    assignments: []
                }),
                cookieStub = sinon.stub($, 'cookie').withArgs('custom_cookie_name').returns('existing_visitor_id'),
                loadVisitorStub = sinon.stub(Visitor, 'loadVisitor').returns($.Deferred().resolve(visitor).promise());

            new Session().getPublicAPI().initialize().then(function() {
                expect(loadVisitorStub).to.be.calledOnce;
                expect(loadVisitorStub).to.be.calledWithExactly('existing_visitor_id');

                expect(cookieStub).to.be.calledTwice;
                expect(cookieStub.firstCall).to.be.calledWithExactly('custom_cookie_name');
                expect(cookieStub.secondCall).to.be.calledWithExactly('custom_cookie_name', 'existing_visitor_id', {
                    expires: 365,
                    path: '/',
                    domain: '.example.com'
                });

                done()
            });
        });

        it('saves the visitor id in a cookie', function(done) {
            var cookieStub = sinon.stub($, 'cookie').withArgs('custom_cookie_name').returns(null);

            new Session().getPublicAPI().initialize().then(function() {
                expect(cookieStub).to.be.calledTwice;
                expect(cookieStub.firstCall).to.be.calledWithExactly('custom_cookie_name');
                expect(cookieStub.secondCall).to.be.calledWithExactly('custom_cookie_name', sinon.match(/^[a-zA-Z0-9\-]{36}$/), {
                    expires: 365,
                    path: '/',
                    domain: '.example.com'
                });

                done()
            });
        });
    });

    context('with stubbed visitor and split registry', function() {
        beforeEach(function() {
            sinon.stub(TestTrackConfig, 'getSplitRegistry').returns({
                jabba: { cgi: 50, puppet: 50 }
            });

            this.jabbaAssignment = new Assignment({
                splitName: 'jabba',
                variant: 'cgi',
                isUnsynced: false
            });

            this.visitor = new Visitor({
                id: 'dummy_visitor_id',
                assignments: [this.jabbaAssignment]
            });

            this.analyticsAliasStub = sinon.stub();
            this.analyticsIdentifyStub = sinon.stub();
            this.visitor.setAnalytics({
                alias: this.analyticsAliasStub,
                identify: this.analyticsIdentifyStub
            })

            sinon.stub(this.visitor, 'setAnalytics');
            sinon.stub(this.visitor, 'setErrorLogger');
            sinon.stub(this.visitor, 'linkIdentifier').callsFake(function() {
                this.visitor._id = 'other_visitor_id'; // mimic behavior of linkIdentifier that we care about
                return $.Deferred().resolve().promise();
            }.bind(this));

            sinon.stub(Visitor, 'loadVisitor').returns($.Deferred().resolve(this.visitor).promise());

            this.session = new Session().getPublicAPI();
            return this.session.initialize();
        });

        describe('#initialize()', function() {
            it('calls notifyUnsyncedAssignments when a visitor is loaded', function(done) {
                sinon.stub(this.visitor, 'notifyUnsyncedAssignments');
                new Session().getPublicAPI().initialize().then(function() {
                    expect(this.visitor.notifyUnsyncedAssignments).to.be.calledOnce;

                    done();
                }.bind(this));
            });

            it('sets the analytics lib', function(done) {
                var analytics = {track: ''};

                new Session().getPublicAPI().initialize({analytics: analytics}).then(function() {
                    expect(this.visitor.setAnalytics).to.be.calledOnce;
                    expect(this.visitor.setAnalytics).to.be.calledWithExactly(analytics);

                    done();
                }.bind(this));
            });

            it('sets the error logger', function(done) {
                var errorLogger = function() { };

                new Session().getPublicAPI().initialize({errorLogger: errorLogger}).then(function() {
                    expect(this.visitor.setErrorLogger).to.be.calledOnce;
                    expect(this.visitor.setErrorLogger).to.be.calledWithExactly(errorLogger);

                    done();
                }.bind(this));
            });
        });

        describe('#logIn()', function() {
            it('updates the visitor id in the cookie', function(done) {
                var cookieStub = sinon.stub($, 'cookie');

                this.session.logIn('myappdb_user_id', 444).then(function() {
                    expect(this.visitor.linkIdentifier).to.be.calledOnce;
                    expect(this.visitor.linkIdentifier).to.be.calledWithExactly('myappdb_user_id', 444);
                    expect(cookieStub).to.be.calledOnce;
                    expect(cookieStub).to.be.calledWithExactly('custom_cookie_name', 'other_visitor_id', {
                        expires: 365,
                        path: '/',
                        domain: '.example.com'
                    });
                    done();
                }.bind(this));
            });

            it('calls analytics.identify with the resolved visitor id', function(done) {
                var self = this;
                this.session.logIn('myappdb_user_id', 444).then(function() {
                    expect(self.analyticsIdentifyStub).to.be.calledOnce;
                    expect(self.analyticsIdentifyStub).to.be.calledWithExactly('other_visitor_id');
                    done();
                });
            });
        });

        describe('#signUp()', function() {
            it('updates the visitor id in the cookie', function(done) {
                var cookieStub = sinon.stub($, 'cookie');

                this.session.signUp('myappdb_user_id', 444).then(function() {
                    expect(this.visitor.linkIdentifier).to.be.calledOnce;
                    expect(this.visitor.linkIdentifier).to.be.calledWithExactly('myappdb_user_id', 444);
                    expect(cookieStub).to.be.calledOnce;
                    expect(cookieStub).to.be.calledWithExactly('custom_cookie_name', 'other_visitor_id', {
                        expires: 365,
                        path: '/',
                        domain: '.example.com'
                    });
                    done();
                }.bind(this));
            });

            it('calls analytics.alias with the resolved visitor id', function(done) {
                var self = this;
                this.session.signUp('myappdb_user_id', 444).then(function() {
                    expect(self.analyticsAliasStub).to.be.calledOnce;
                    expect(self.analyticsAliasStub).to.be.calledWithExactly('other_visitor_id');
                    done();
                });
            });
        });

        describe('#vary()', function() {
            it('calls the correct vary function for the given split', function(done) {
                this.session.vary('jabba', {
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

        describe('#ab()', function() {
            it('passes true or false into the callback', function(done) {
                this.session.ab('jabba', {
                    context: 'spec',
                    trueVariant: 'cgi',
                    callback: function(cgi) {
                        expect(cgi).to.be.true;
                        done();
                    }
                });
            });
        });

        describe('#getPublicAPI()', function() {
            var session = new Session();

            it ('returns an object with a limited set of methods', function() {
                expect(session.getPublicAPI()).to.have.all.keys([
                    'vary',
                    'ab',
                    'logIn',
                    'signUp',
                    'initialize',
                    '_crx'
                ]);

                expect(session.getPublicAPI()._crx).to.have.all.keys([
                    'loadInfo',
                    'persistAssignment'
                ]);
            });

            describe('_crx', function() {
                beforeEach(function() {
                    var session = new Session().getPublicAPI();
                    session.initialize();
                    this.crx = session._crx;
                });

                describe('#persistAssignment()', function() {
                    it('creates an AssignmentOverride and perists it', function(done) {
                        var persistAssignmentDeferred = $.Deferred(),
                            assignmentOverrideStub = sinon.stub(window, 'AssignmentOverride').returns({
                                persistAssignment: sinon.stub().returns(persistAssignmentDeferred.promise())
                            });

                        this.crx.persistAssignment('split', 'variant', 'the_username', 'the_password').then(function() {
                            expect(assignmentOverrideStub).to.be.calledOnce;
                            expect(assignmentOverrideStub).to.be.calledWithExactly({
                                visitor: this.visitor,
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

                describe('#loadInfo()', function() {
                    it('returns a promise that resolves with the split registry, assignment registry and visitor id', function(done) {
                        this.crx.loadInfo().then(function(info) {
                            expect(info.visitorId).to.equal('dummy_visitor_id');
                            expect(info.splitRegistry).to.deep.equal({ jabba: { cgi: 50, puppet: 50 } });
                            expect(info.assignmentRegistry).to.deep.equal({ jabba: 'cgi' });
                            done();
                        });
                    });
                });
            });

            describe('context of the public API methods', function() {

                beforeEach(function() {
                    this.varyStub = sinon.stub(this.session, 'vary');
                    this.abStub = sinon.stub(this.session, 'ab');
                    this.logInStub = sinon.stub(this.session, 'logIn');
                    this.signUpStub = sinon.stub(this.session, 'signUp');
                });

                it('runs #vary() in the context of the session', function() {
                    this.session.vary();
                    expect(this.varyStub.thisValues[0]).to.equal(this.session);
                });

                it('runs #ab() in the context of the session', function() {
                    this.session.ab();
                    expect(this.abStub.thisValues[0]).to.equal(this.session);
                });

                it('runs #logIn() in the context of the session', function() {
                    this.session.logIn();
                    expect(this.logInStub.thisValues[0]).to.equal(this.session);
                });

                it('runs #signUp() in the context of the session', function() {
                    this.session.signUp();
                    expect(this.signUpStub.thisValues[0]).to.equal(this.session);
                });
            });
        });
    });
});
