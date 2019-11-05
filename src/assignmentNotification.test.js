import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

const mockClient = new MockAdapter(client);

describe('AssignmentNotification', () => {
  let notificationOptions;
  function createNotification() {
    return new AssignmentNotification(notificationOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    mockClient.onPost().reply(200);

    testContext.visitor = new Visitor({
      id: 'visitorId',
      assignments: []
    });

    testContext.analyticsTrackStub = jest.fn().mockResolvedValue(true);
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

  afterEach(() => {
    mockClient.reset();
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
      expect(testContext.analyticsTrackStub).toHaveBeenCalledWith('visitorId', testContext.assignment);
    });

    it('notifies the test track server with an analytics success', () => {
      testContext.analyticsTrackStub.mockResolvedValue(true);

      return testContext.notification.send().then(() => {
        expect(mockClient.history.post.length).toBe(2);
        expect(mockClient.history.post[0].data).toEqual(
          JSON.stringify({
            visitor_id: 'visitorId',
            split_name: 'jabba',
            context: 'spec',
            mixpanel_result: undefined
          })
        );
        expect(mockClient.history.post[1].data).toEqual(
          JSON.stringify({
            visitor_id: 'visitorId',
            split_name: 'jabba',
            context: 'spec',
            mixpanel_result: 'success'
          })
        );
      });
    });

    it('notifies the test track server with an analytics failure', () => {
      testContext.analyticsTrackStub.mockResolvedValue(false);

      return testContext.notification.send().then(() => {
        expect(mockClient.history.post.length).toBe(2);
        expect(mockClient.history.post[0].data).toEqual(
          JSON.stringify({
            visitor_id: 'visitorId',
            split_name: 'jabba',
            context: 'spec',
            mixpanel_result: undefined
          })
        );
        expect(mockClient.history.post[1].data).toEqual(
          JSON.stringify({
            visitor_id: 'visitorId',
            split_name: 'jabba',
            context: 'spec',
            mixpanel_result: 'failure'
          })
        );
      });
    });

    it('logs an error if the request fails', () => {
      testContext.analyticsTrackStub.mockResolvedValue(false);
      mockClient.onPost().reply(500, null);

      return testContext.notification.send().then(() => {
        expect(testContext.visitor.logError).toHaveBeenCalledTimes(2);
        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment error: 500, undefined, null'
        );
      });
    });
  });
});
