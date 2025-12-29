import Assignment from './assignment';
import { AnalyticsProvider } from './analyticsProvider';
import AssignmentNotification, { AssignmentNotificationOptions } from './assignmentNotification';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

const mockClient = new MockAdapter(client);

const track = (success: boolean): AnalyticsProvider['trackAssignment'] => (_, __, callback) => callback(success);

describe('AssignmentNotification', () => {
  let visitor: Visitor;
  let analyticsTrackStub: jest.Mock;
  let assignment: Assignment;
  let notification: AssignmentNotification;
  let notificationOptions: AssignmentNotificationOptions;

  function createNotification() {
    return new AssignmentNotification(notificationOptions);
  }

  beforeEach(() => {
    mockClient.onPost().reply(200);

    visitor = new Visitor({
      id: 'visitorId',
      assignments: []
    });

    analyticsTrackStub = jest.fn().mockImplementation(track(true));
    visitor.setAnalytics({
      trackAssignment: analyticsTrackStub,
      identify: jest.fn(),
      alias: jest.fn()
    });
    visitor.logError = jest.fn();

    assignment = new Assignment({
      splitName: 'jabba',
      variant: 'cgi',
      context: 'spec',
      isUnsynced: false
    });

    notificationOptions = {
      visitor: visitor,
      assignment: assignment
    };

    notification = createNotification();
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
      notification.send();

      expect(analyticsTrackStub).toHaveBeenCalledTimes(1);
      expect(analyticsTrackStub).toHaveBeenCalledWith('visitorId', assignment, expect.any(Function));
    });

    it('notifies the test track server with an analytics success', () => {
      analyticsTrackStub.mockImplementation(track(true));

      return notification.send().then(() => {
        expect(mockClient.history.post.length).toBe(2);
        expect(mockClient.history.post[0].data).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
        expect(mockClient.history.post[1].data).toEqual(
          'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=success'
        );
      });
    });

    it('notifies the test track server with an analytics failure', () => {
      analyticsTrackStub.mockImplementation(track(false));

      return notification.send().then(() => {
        expect(mockClient.history.post.length).toBe(2);
        expect(mockClient.history.post[0].data).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
        expect(mockClient.history.post[1].data).toEqual(
          'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=failure'
        );
      });
    });

    it('logs an error on an error response', () => {
      analyticsTrackStub.mockImplementation(track(false));
      mockClient.reset();
      mockClient.onPost().reply(500, null);

      return notification.send().then(() => {
        expect(visitor.logError).toHaveBeenCalledTimes(2);
        expect(visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment response error: 500, undefined, null'
        );
      });
    });

    it('logs an error on an failed request', () => {
      mockClient.reset();
      mockClient.onPost().networkError();

      return notification.send().then(() => {
        expect(visitor.logError).toHaveBeenCalledTimes(2);
        expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment other error: Error: Network Error');
      });
    });
  });
});
