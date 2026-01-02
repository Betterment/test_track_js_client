import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Visitor from './visitor';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';

vi.mock('./testTrackConfig', () => {
  return {
    default: {
      getUrl: () => 'http://testtrack.dev'
    }
  };
});

function createVisitor(options: { trackSuccess: boolean }) {
  const visitor = new Visitor({ id: 'visitorId', assignments: [] });

  visitor.setAnalytics({
    identify: vi.fn(),
    alias: vi.fn(),
    trackAssignment: vi.fn().mockImplementation((_visitorId, _assignment, callback) => callback(options.trackSuccess))
  });
  visitor.logError = vi.fn();

  return visitor;
}

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('AssignmentNotification', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
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
      expect(requests.length).toBe(2);
      expect(await requests[0].text()).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
      expect(await requests[1].text()).toEqual(
        'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=success'
      );
    });

    it('notifies the test track server with an analytics failure', async () => {
      const visitor = createVisitor({ trackSuccess: false });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      await notification.send();
      expect(requests.length).toBe(2);
      expect(await requests[0].text()).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
      expect(await requests[1].text()).toEqual(
        'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=failure'
      );
    });

    it('logs an error on an error response', async () => {
      server.use(
        http.post('http://testtrack.dev/api/v1/assignment_event', () => {
          return HttpResponse.json(null, { status: 500 });
        })
      );

      const visitor = createVisitor({ trackSuccess: false });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      await notification.send();
      expect(visitor.logError).toHaveBeenCalledTimes(2);
      expect(visitor.logError).toHaveBeenCalledWith(
        'test_track persistAssignment error: Error: HTTP request failed with 500 status'
      );
    });

    it('logs an error on an failed request', async () => {
      server.use(
        http.post('http://testtrack.dev/api/v1/assignment_event', () => {
          return HttpResponse.error();
        })
      );

      const visitor = createVisitor({ trackSuccess: true });
      const assignment = createAssignment();
      const notification = new AssignmentNotification({ visitor, assignment });

      await notification.send();
      expect(visitor.logError).toHaveBeenCalledTimes(2);
      expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
    });
  });
});
