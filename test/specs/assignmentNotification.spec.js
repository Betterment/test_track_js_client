import Assignment from '../../src/assignment';
import AssignmentNotification from '../../src/assignmentNotification';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';

describe('AssignmentNotification', function() {
    var notificationOptions;

    afterEach(function() {
        sinon.restore();
        TestTrackConfig._clear();
    });

    function createNotification() {
        return new AssignmentNotification(notificationOptions);
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

        notificationOptions = {
            visitor: this.visitor,
            assignment: this.assignment
        };

        this.notification = createNotification();
    });

    it('requires a visitor', function() {
        expect(function() {
            delete notificationOptions.visitor;
            createNotification();
        }).to.throw('must provide visitor');
    });

    it('requires an assignment', function() {
        expect(function() {
            delete notificationOptions.assignment;
            createNotification();
        }).to.throw('must provide assignment');
    });

    describe('#send()', function() {
        it('tracks an event', function() {
            this.notification.send();

            expect(this.analyticsTrackStub).to.be.calledOnce;
            expect(this.analyticsTrackStub).to.be.calledWithExactly(
                'visitorId',
                this.assignment,
                sinon.match.func);
        });

        it('notifies the test track server with an analytics success', function() {
            var persistAssignmentStub = sinon.stub(this.notification, 'persistAssignment');

            this.notification.send();

            this.analyticsTrackStub.yield(true);

            expect(persistAssignmentStub).to.be.calledTwice;
            expect(persistAssignmentStub.firstCall).to.be.calledWithExactly();
            expect(persistAssignmentStub.secondCall).to.be.calledWithExactly("success");
        });

        it('notifies the test track server with an analytics failure', function() {
            var persistAssignmentStub = sinon.stub(this.notification, 'persistAssignment');

            this.notification.send();

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
            this.notification.persistAssignment();

            expect(this.ajaxStub).to.be.calledOnce;
            expect(this.ajaxStub).to.be.calledWith('http://testtrack.dev/api/v1/assignment_event', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                data: {
                    visitor_id: 'visitorId',
                    split_name: 'jabba',
                    context: 'spec',
                    mixpanel_result: undefined
                }
            });
        });

        it('includes mixpanel result in request if provided', function() {
            this.notification.persistAssignment('success');

            expect(this.ajaxStub).to.be.calledOnce;
            expect(this.ajaxStub).to.be.calledWith('http://testtrack.dev/api/v1/assignment_event', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                data: {
                    visitor_id: 'visitorId',
                    split_name: 'jabba',
                    context: 'spec',
                    mixpanel_result: 'success'
                }
            });
        });

        it('logs an error if the request fails', function() {
            var deferred = $.Deferred();
            deferred.reject({ status: 500, responseText: 'Internal Server Error' }, 'textStatus', 'errorThrown');
            this.ajaxStub.returns(deferred.promise());

            this.notification.persistAssignment('success');

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('test_track persistAssignment error: [object Object], 500, Internal Server Error, textStatus, errorThrown');
        });
    });
});
