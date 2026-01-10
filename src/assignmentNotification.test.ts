import { Assignment } from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createClient } from './client';
import type { AnalyticsProvider } from './analyticsProvider';

const client = createClient({ url: 'http://testtrack.dev' });

const analytics = {
  identify: vi.fn(),
  alias: vi.fn(),
  trackAssignment: vi
    .fn<AnalyticsProvider['trackAssignment']>()
    .mockImplementation((_visitorId, _assignment, callback) => callback(true))
};

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('sendAssignmentNotification', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
  });

  it('tracks an event', async () => {
    const assignment = createAssignment();
    const errorLogger = vi.fn();

    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });

    expect(analytics.trackAssignment).toHaveBeenCalledTimes(1);
    expect(analytics.trackAssignment).toHaveBeenCalledWith('visitorId', assignment, expect.any(Function));
  });

  it('notifies the test track server with an analytics success', async () => {
    const assignment = createAssignment();
    const errorLogger = vi.fn();

    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });
    expect(requests.length).toBe(2);
    expect(await requests[0]!.text()).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
    expect(await requests[1]!.text()).toEqual(
      'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=success'
    );
  });

  it('notifies the test track server with an analytics failure', async () => {
    const assignment = createAssignment();
    const errorLogger = vi.fn();

    analytics.trackAssignment.mockImplementationOnce((_visitorId, _assignment, callback) => callback(false));
    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });

    expect(requests.length).toBe(2);
    expect(await requests[0]!.text()).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
    expect(await requests[1]!.text()).toEqual(
      'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=failure'
    );
  });

  it('logs an error on an error response', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const assignment = createAssignment();
    const errorLogger = vi.fn();

    analytics.trackAssignment.mockImplementationOnce((_visitorId, _assignment, callback) => callback(false));
    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });

    expect(errorLogger).toHaveBeenCalledTimes(2);
    expect(errorLogger).toHaveBeenCalledWith(
      'test_track persistAssignment error: Error: HTTP request failed with 500 status'
    );
  });

  it('logs an error on an failed request', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.error();
      })
    );

    const assignment = createAssignment();
    const errorLogger = vi.fn();

    await sendAssignmentNotification({ client, visitorId: 'visitorId', analytics, assignment, errorLogger });
    expect(errorLogger).toHaveBeenCalledTimes(2);
    expect(errorLogger).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
  });
});
