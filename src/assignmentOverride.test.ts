import Assignment from './assignment';
import { persistAssignmentOverride } from './assignmentOverride';
import Visitor from './visitor';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createConfig } from './test-utils';

function createVisitor() {
  const visitor = new Visitor({ config: createConfig(), id: 'visitorId', assignments: [] });
  visitor.logError = vi.fn();
  return visitor;
}

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('persistAssignmentOverride', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_override', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
  });

  it('creates an assignment on the test track server', async () => {
    const visitor = createVisitor();
    const assignment = createAssignment();

    await persistAssignmentOverride({
      visitor,
      assignment,
      username: 'the_username',
      password: 'the_password'
    });
    expect(requests.length).toBe(1);
    expect(requests[0].url).toEqual('http://testtrack.dev/api/v1/assignment_override');
    expect(await requests[0].text()).toEqual(
      'visitor_id=visitorId&split_name=jabba&variant=cgi&context=spec&mixpanel_result=success'
    );
    expect(requests[0].headers.get('authorization')).toEqual('Basic ' + btoa('the_username:the_password'));
  });

  it('logs an error on an error response', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_override', () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const visitor = createVisitor();
    const assignment = createAssignment();

    await persistAssignmentOverride({
      visitor,
      assignment,
      username: 'the_username',
      password: 'the_password'
    });
    expect(visitor.logError).toHaveBeenCalledTimes(1);
    expect(visitor.logError).toHaveBeenCalledWith(
      'test_track persistAssignment error: Error: HTTP request failed with 500 status'
    );
  });

  it('logs an error on a network error', async () => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_override', () => {
        return HttpResponse.error();
      })
    );

    const visitor = createVisitor();
    const assignment = createAssignment();

    await persistAssignmentOverride({
      visitor,
      assignment,
      username: 'the_username',
      password: 'the_password'
    });
    expect(visitor.logError).toHaveBeenCalledTimes(1);
    expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
  });
});
