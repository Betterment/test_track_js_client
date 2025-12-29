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

function createVisitor(options: { trackSuccess: boolean }) {
  const visitor = new Visitor({ id: 'visitorId', assignments: [] });

  visitor.setAnalytics({
    identify: jest.fn(),
    alias: jest.fn(),
    trackAssignment: jest.fn().mockImplementation((_visitorId, _assignment, callback) => callback(options.trackSuccess))
  });
  visitor.logError = jest.fn();

  return visitor;
}

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('AssignmentNotification', () => {
  beforeEach(() => {
    mockClient.onPost().reply(200);
  });

  afterEach(() => {
    mockClient.reset();
  });

  it('requires a visitor', () => {
    const assignment = createAssignment();
    // @ts-expect-error Intentionally passing the wrong types
    expect(() => new AssignmentNotification({ assignment })).toThrow('must provide visitor');
  });

  it('requires an assignment', () => {
    const visitor = createVisitor({ trackSuccess: true });
    // @ts-expect-error Intentionally passing the wrong types
    expect(() => new AssignmentNotification({ visitor })).toThrow('must provide assignment');
  });

  describe('#send()', () => {
    it('tracks an event', () => {
      const visitor = createVisitor({ trackSuccess: true });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      notification.send();

      expect(visitor.analytics.trackAssignment).toHaveBeenCalledTimes(1);
      expect(visitor.analytics.trackAssignment).toHaveBeenCalledWith('visitorId', assignment, expect.any(Function));
    });

    it('notifies the test track server with an analytics success', async () => {
      const visitor = createVisitor({ trackSuccess: true });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      await notification.send();
      expect(mockClient.history.post.length).toBe(2);
      expect(mockClient.history.post[0].data).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
      expect(mockClient.history.post[1].data).toEqual(
        'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=success'
      );
    });

    it('notifies the test track server with an analytics failure', async () => {
      const visitor = createVisitor({ trackSuccess: false });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      await notification.send();
      expect(mockClient.history.post.length).toBe(2);
      expect(mockClient.history.post[0].data).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
      expect(mockClient.history.post[1].data).toEqual(
        'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=failure'
      );
    });

    it('logs an error on an error response', async () => {
      const visitor = createVisitor({ trackSuccess: false });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      mockClient.reset();
      mockClient.onPost().reply(500, null);

      await notification.send();
      expect(visitor.logError).toHaveBeenCalledTimes(2);
      expect(visitor.logError).toHaveBeenCalledWith(
        'test_track persistAssignment response error: 500, undefined, null'
      );
    });

    it('logs an error on an failed request', async () => {
      const visitor = createVisitor({ trackSuccess: true });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      mockClient.reset();
      mockClient.onPost().networkError();

      await notification.send();
      expect(visitor.logError).toHaveBeenCalledTimes(2);
      expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment other error: Error: Network Error');
    });
  });
});
