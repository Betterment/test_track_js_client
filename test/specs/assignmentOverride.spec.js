import Assignment from '../../src/assignment';
import AssignmentOverride from '../../src/assignmentOverride';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';

describe('AssignmentOverride', function() {
    var overrideOptions;

    afterEach(function() {
        sinon.restore();
        TestTrackConfig._clear();
    });

    function createOverride() {
        return new AssignmentOverride(overrideOptions);
    }

    beforeEach(function() {
        sinon.stub(TestTrackConfig, 'getUrl').returns('http://testtrack.dev');

        this.visitor = new Visitor({
            id: 'visitorId',
            assignments: []
        });

        this.analyticsTrackStub = sinon.stub();
        this.visitor.setAnalytics({
            trackAssignment: this.analyticsTrackStub
        });

        this.logErrorStub = sinon.stub(this.visitor, 'logError');

        this.assignment = new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            context: 'spec',
            isUnsynced: false
        });

        overrideOptions = {
            visitor: this.visitor,
            assignment: this.assignment,
            username: 'the_username',
            password: 'the_password'
        };

        this.override = createOverride();
    });

    it('requires a visitor', function() {
        expect(function() {
            delete overrideOptions.visitor;
            createOverride();
        }).to.throw('must provide visitor');
    });

    it('requires an assignment', function() {
        expect(function() {
            delete overrideOptions.assignment;
            createOverride();
        }).to.throw('must provide assignment');
    });

    it('requires an username', function() {
        expect(function() {
            delete overrideOptions.username;
            createOverride();
        }).to.throw('must provide username');
    });

    it('requires a password', function() {
        expect(function() {
            delete overrideOptions.password;
            createOverride();
        }).to.throw('must provide password');
    });

    describe('#send()', function() {
        it('tracks an event', function() {
            this.override.send();

            expect(this.analyticsTrackStub).to.be.calledOnce;
            expect(this.analyticsTrackStub).to.be.calledWithExactly(
                'visitorId',
                this.assignment,
                sinon.match.func);
        });

        it('notifies the test track server with an analytics success', function() {
            var persistAssignmentStub = sinon.stub(this.override, 'persistAssignment');

            this.override.send();

            this.analyticsTrackStub.yield(true);

            expect(persistAssignmentStub).to.be.calledTwice;
            expect(persistAssignmentStub.firstCall).to.be.calledWithExactly();
            expect(persistAssignmentStub.secondCall).to.be.calledWithExactly("success");
        });

        it('notifies the test track server with an analytics failure', function() {
            var persistAssignmentStub = sinon.stub(this.override, 'persistAssignment');

            this.override.send();

            this.analyticsTrackStub.yield(false);

            expect(persistAssignmentStub).to.be.calledTwice;
            expect(persistAssignmentStub.firstCall).to.be.calledWithExactly();
            expect(persistAssignmentStub.secondCall).to.be.calledWithExactly("failure");
        });
    });

    describe('#persistAssignment()', function() {
        beforeEach(function() {
            this.ajaxStub = sinon.stub($, 'ajax').returns($.Deferred().promise());
        });

        it('creates an assignment on the test track server', function() {
            this.override.persistAssignment();

            expect(this.ajaxStub).to.be.calledOnce;
            expect(this.ajaxStub).to.be.calledWith('http://testtrack.dev/api/v1/assignment_override', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                headers: {
                    'Authorization': 'Basic dGhlX3VzZXJuYW1lOnRoZV9wYXNzd29yZA==' // Base64 of 'the_username:the_password'
                },
                data: {
                    visitor_id: 'visitorId',
                    split_name: 'jabba',
                    variant: 'cgi',
                    context: 'spec',
                    mixpanel_result: undefined
                }
            });
        });

        it('includes mixpanel result in request if provided', function() {
            this.override.persistAssignment('success');

            expect(this.ajaxStub).to.be.calledOnce;
            expect(this.ajaxStub).to.be.calledWith('http://testtrack.dev/api/v1/assignment_override', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                headers: {
                    'Authorization': 'Basic dGhlX3VzZXJuYW1lOnRoZV9wYXNzd29yZA==' // Base64 of 'the_username:the_password'
                },
                data: {
                    visitor_id: 'visitorId',
                    split_name: 'jabba',
                    variant: 'cgi',
                    context: 'spec',
                    mixpanel_result: 'success'
                }
            });
        });

        it('logs an error if the request fails', function() {
            var deferred = $.Deferred();
            deferred.reject({ status: 500, responseText: 'Internal Server Error' }, 'textStatus', 'errorThrown');
            this.ajaxStub.returns(deferred.promise());

            this.override.persistAssignment('success');

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('test_track persistAssignment error: [object Object], 500, Internal Server Error, textStatus, errorThrown');
        });
    });
});

