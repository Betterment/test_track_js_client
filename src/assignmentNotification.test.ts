import Assignment from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import Visitor from './visitor';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createConfig } from './test-utils';
import type { Config } from './config';

function createVisitor(options: { trackSuccess: boolean }): { visitor: Visitor; config: Config } {
  const config = createConfig();
  const visitor = new Visitor({ config, id: 'visitorId', assignments: [] });

  visitor.setAnalytics({
    identify: vi.fn(),
    alias: vi.fn(),
    trackAssignment: vi.fn().mockImplementation((_visitorId, _assignment, callback) => callback(options.trackSuccess))
  });
  visitor.logError = vi.fn();

  return { visitor, config };
}

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
    const { visitor, config } = createVisitor({ trackSuccess: true });
    const assignment = createAssignment();

    await sendAssignmentNotification({ config, visitor, assignment });

    expect(visitor.analytics.trackAssignment).toHaveBeenCalledTimes(1);
    expect(visitor.analytics.trackAssignment).toHaveBeenCalledWith('visitorId', assignment, expect.any(Function));
  });

  it('notifies the test track server with an analytics success', async () => {
    const { visitor, config } = createVisitor({ trackSuccess: true });
    const assignment = createAssignment();

    await sendAssignmentNotification({ config, visitor, assignment });
    expect(requests.length).toBe(2);
    expect(await requests[0].text()).toEqual('visitor_id=visitorId&split_name=jabba&context=spec');
    expect(await requests[1].text()).toEqual(
      'visitor_id=visitorId&split_name=jabba&context=spec&mixpanel_result=success'
    );
  });

  it('notifies the test track server with an analytics failure', async () => {
    const { visitor, config } = createVisitor({ trackSuccess: false });
    const assignment = createAssignment();

    await sendAssignmentNotification({ config, visitor, assignment });
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

    const { visitor, config } = createVisitor({ trackSuccess: false });
    const assignment = createAssignment();

    await sendAssignmentNotification({ config, visitor, assignment });
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

    const { visitor, config } = createVisitor({ trackSuccess: true });
    const assignment = createAssignment();

    await sendAssignmentNotification({ config, visitor, assignment });
    expect(visitor.logError).toHaveBeenCalledTimes(2);
    expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
  });
});
