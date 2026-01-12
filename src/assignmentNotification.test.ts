import type { Assignment } from './visitor';
import { sendAssignmentNotification } from './assignmentNotification';
import { http, HttpResponse } from 'msw';
import { server, getRequests } from './setupTests';
import { createClient } from './client';

const client = createClient({ url: 'http://testtrack.dev' });

const analytics = {
  identify: vi.fn(),
  alias: vi.fn(),
  trackAssignment: vi.fn()
};

function createAssignment(): Assignment {
  return { splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false };
}

describe('sendAssignmentNotification', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
  });

  it('tracks an event and notifies the test track server', async () => {
    const assignment = createAssignment();
    const errorLogger = vi.fn();

    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });

    expect(analytics.trackAssignment).toHaveBeenCalledWith('visitorId', assignment);
    expect(await getRequests()).toEqual([
      {
        method: 'POST',
        url: 'http://testtrack.dev/api/v1/assignment_event',
        body: { visitor_id: 'visitorId', split_name: 'jabba', context: 'spec', mixpanel_result: 'success' }
      }
    ]);
  });

  it('logs an error when the request fails', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const assignment = createAssignment();
    const errorLogger = vi.fn();

    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });

    expect(errorLogger).toHaveBeenCalledWith(
      'test_track persistAssignment error: Error: HTTP request failed with 500 status'
    );
  });
});
