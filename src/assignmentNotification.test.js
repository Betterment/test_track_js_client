import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import TestTrackConfig from './testTrackConfig'; // eslint-disable-line no-unused-vars
import Visitor from './visitor';
import client from './api';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

describe('AssignmentNotification', () => {
  let notificationOptions;
  function createNotification() {
    return new AssignmentNotification(notificationOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    client.post = jest.fn().mockImplementation(() => Promise.resolve());

    testContext.visitor = new Visitor({
      id: 'visitorId',
      assignments: []
    });

    testContext.analyticsTrackStub = jest.fn();
    testContext.visitor.setAnalytics({
      trackAssignment: testContext.analyticsTrackStub
    });
    testContext.visitor.logError = jest.fn();

    testContext.assignment = new Assignment({
      splitName: 'jabba',
      variant: 'cgi',
      context: 'spec',
      isUnsynced: false
    });

    notificationOptions = {
      visitor: testContext.visitor,
      assignment: testContext.assignment
    };

    testContext.notification = createNotification();
  });

  it('requires a visitor', () => {
    expect(function() {
      delete notificationOptions.visitor;
      createNotification();
    }).toThrow('must provide visitor');
  });

  it('requires an assignment', () => {
    expect(function() {
      delete notificationOptions.assignment;
      createNotification();
    }).toThrow('must provide assignment');
  });

  describe('#send()', () => {
    it('tracks an event', () => {
      testContext.notification.send();

      expect(testContext.analyticsTrackStub).toHaveBeenCalledTimes(1);
      expect(testContext.analyticsTrackStub).toHaveBeenCalledWith(
        'visitorId',
        testContext.assignment,
        expect.any(Function)
      );
    });

    it('notifies the test track server with an analytics success', () => {
      testContext.analyticsTrackStub.mockImplementation((visitor_id, assignment, callback) => {
        callback(true);
      });

      testContext.notification.send();

      expect(client.post).toHaveBeenCalledTimes(2);
      expect(client.post).toHaveBeenNthCalledWith(
        1,
        'http://testtrack.dev/api/v1/assignment_event',
        {
          visitor_id: 'visitorId',
          split_name: 'jabba',
          context: 'spec',
          mixpanel_result: undefined
        },
        { crossDomain: true }
      );
      expect(client.post).toHaveBeenNthCalledWith(
        2,
        'http://testtrack.dev/api/v1/assignment_event',
        {
          visitor_id: 'visitorId',
          split_name: 'jabba',
          context: 'spec',
          mixpanel_result: 'success'
        },
        { crossDomain: true }
      );
    });

    it('notifies the test track server with an analytics failure', () => {
      testContext.analyticsTrackStub.mockImplementation((visitor_id, assignment, callback) => {
        callback(false);
      });

      testContext.notification.send();

      expect(client.post).toHaveBeenCalledTimes(2);
      expect(client.post).toHaveBeenNthCalledWith(
        1,
        'http://testtrack.dev/api/v1/assignment_event',
        {
          visitor_id: 'visitorId',
          split_name: 'jabba',
          context: 'spec',
          mixpanel_result: undefined
        },
        { crossDomain: true }
      );
      expect(client.post).toHaveBeenNthCalledWith(
        2,
        'http://testtrack.dev/api/v1/assignment_event',
        {
          visitor_id: 'visitorId',
          split_name: 'jabba',
          context: 'spec',
          mixpanel_result: 'failure'
        },
        { crossDomain: true }
      );
    });

    it('logs an error if the request fails', () => {
      client.post = jest.fn().mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: null
        }
      });

      // eslint-disable-next-line jest/valid-expect-in-promise
      testContext.notification.send().then(() => {
        expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment 500, Internal Server Error'
        );
      });
    });
  });
});
