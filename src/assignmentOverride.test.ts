import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

const mockClient = new MockAdapter(client);

function createVisitor() {
  const visitor = new Visitor({ id: 'visitorId', assignments: [] });
  visitor.logError = jest.fn();
  return visitor;
}

function createAssignment() {
  return new Assignment({ splitName: 'jabba', variant: 'cgi', context: 'spec', isUnsynced: false });
}

describe('AssignmentOverride', () => {
  beforeEach(() => {
    mockClient.onPost('/v1/assignment_override').reply(200);
  });

  afterEach(() => {
    mockClient.reset();
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
      expect(mockClient.history.post.length).toBe(1);
      expect(mockClient.history.post[0].url).toEqual(expect.stringContaining('/v1/assignment_override'));
      expect(mockClient.history.post[0].data).toEqual(
        'visitor_id=visitorId&split_name=jabba&variant=cgi&context=spec&mixpanel_result=success'
      );
      expect(mockClient.history.post[0].auth).toEqual({
        username: 'the_username',
        password: 'the_password'
      });
    });

    it('logs an error on an error response', async () => {
      const visitor = createVisitor();
      const assignment = createAssignment();
      const override = new AssignmentOverride({
        visitor,
        assignment,
        username: 'the_username',
        password: 'the_password'
      });

      mockClient.reset();
      mockClient.onPost().reply(500);

      await override.persistAssignment();
      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith(
        'test_track persistAssignment response error: 500, undefined, undefined'
      );
    });

    it('logs an error on a network error', async () => {
      const visitor = createVisitor();
      const assignment = createAssignment();
      const override = new AssignmentOverride({
        visitor,
        assignment,
        username: 'the_username',
        password: 'the_password'
      });

      mockClient.reset();
      mockClient.onPost().networkError();

      await override.persistAssignment();
      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment other error: Error: Network Error');
    });
  });
});
