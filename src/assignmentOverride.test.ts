import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
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

function createVisitor() {
  const visitor = new Visitor({ id: 'visitorId', assignments: [] });
  visitor.logError = vi.fn();
  return visitor;
}

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('AssignmentOverride', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_override', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
  });

  it('requires a visitor', () => {
    const assignment = createAssignment();
    // @ts-expect-error Intentionally passing invalid types
    expect(() => new AssignmentOverride({ assignment, username: 'user', password: 'pass' })).toThrow(
      'must provide visitor'
    );
  });

  it('requires an assignment', () => {
    const visitor = createVisitor();
    // @ts-expect-error Intentionally passing invalid types
    expect(() => new AssignmentOverride({ visitor, username: 'user', password: 'pass' })).toThrow(
      'must provide assignment'
    );
  });

  it('requires an username', () => {
    const visitor = createVisitor();
    const assignment = createAssignment();
    // @ts-expect-error Intentionally passing invalid types
    expect(() => new AssignmentOverride({ visitor, assignment, password: 'pass' })).toThrow('must provide username');
  });

  it('requires a password', () => {
    const visitor = createVisitor();
    const assignment = createAssignment();
    // @ts-expect-error Intentionally passing invalid types
    expect(() => new AssignmentOverride({ visitor, assignment, username: 'user' })).toThrow('must provide password');
  });

  describe('#persistAssignment()', () => {
    it('creates an assignment on the test track server', async () => {
      const visitor = createVisitor();
      const assignment = createAssignment();
      const override = new AssignmentOverride({
        visitor,
        assignment,
        username: 'the_username',
        password: 'the_password'
      });

      await override.persistAssignment();
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
      const override = new AssignmentOverride({
        visitor,
        assignment,
        username: 'the_username',
        password: 'the_password'
      });

      await override.persistAssignment();
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
      const override = new AssignmentOverride({
        visitor,
        assignment,
        username: 'the_username',
        password: 'the_password'
      });

      await override.persistAssignment();
      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment error: TypeError: Failed to fetch');
    });
  });
});
