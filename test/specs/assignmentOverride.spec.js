import Assignment from '../../src/assignment';
import AssignmentOverride from '../../src/assignmentOverride';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';
import $ from 'jquery';

jest.mock('../../src/testTrackConfig', () => {
    return {
        getUrl: () => 'http://testtrack.dev'
    };
});

describe('AssignmentOverride', () => {
    let overrideOptions;
    function createOverride() {
        return new AssignmentOverride(overrideOptions);
    }

    let testContext;
    beforeEach(() => {
        testContext = {};
        $.ajax = jest.fn().mockImplementation(() => $.Deferred().resolve());

        testContext.visitor = new Visitor({
            id: 'visitorId',
            assignments: []
        });
        testContext.visitor.logError = jest.fn();

        testContext.assignment = new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            context: 'spec',
            isUnsynced: false
        });

        overrideOptions = {
            visitor: testContext.visitor,
            assignment: testContext.assignment,
            username: 'the_username',
            password: 'the_password'
        };

        testContext.override = createOverride();
    });

    it('requires a visitor', () => {
        expect(function() {
            delete overrideOptions.visitor;
            createOverride();
        }).toThrowError('must provide visitor');
    });

    it('requires an assignment', () => {
        expect(function() {
            delete overrideOptions.assignment;
            createOverride();
        }).toThrowError('must provide assignment');
    });

    it('requires an username', () => {
        expect(function() {
            delete overrideOptions.username;
            createOverride();
        }).toThrowError('must provide username');
    });

    it('requires a password', () => {
        expect(function() {
            delete overrideOptions.password;
            createOverride();
        }).toThrowError('must provide password');
    });

    describe('#persistAssignment()', () => {
        it('creates an assignment on the test track server', () => {
            testContext.override.persistAssignment();

            expect($.ajax).toHaveBeenCalledTimes(1);
            expect($.ajax).toHaveBeenCalledWith('http://testtrack.dev/api/v1/assignment_override', {
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

        it('logs an error if the request fails', () => {
            $.ajax = jest.fn().mockImplementation(function() {
                return $.Deferred().rejectWith(null, [{ status: 500, responseText: 'Internal Server Error' }, 'textStatus', 'errorThrown']);
            });

            testContext.override.persistAssignment();

            expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
            expect(testContext.visitor.logError).toHaveBeenCalledWith('test_track persistAssignment error: [object Object], 500, Internal Server Error, textStatus, errorThrown');
        });
    });
});

