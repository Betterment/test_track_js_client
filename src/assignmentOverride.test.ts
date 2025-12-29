import Assignment from './assignment';
import AssignmentOverride, { AssignmentOverrideOptions } from './assignmentOverride';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

const mockClient = new MockAdapter(client);

describe('AssignmentOverride', () => {
  let visitor: Visitor;
  let assignment: Assignment;
  let override: AssignmentOverride;
  let overrideOptions: AssignmentOverrideOptions;

  function createOverride() {
    return new AssignmentOverride(overrideOptions);
  }

  beforeEach(() => {
    mockClient.onPost('/v1/assignment_override').reply(200);

    visitor = new Visitor({
      id: 'visitorId',
      assignments: []
    });
    visitor.logError = jest.fn();

    assignment = new Assignment({
      splitName: 'jabba',
      variant: 'cgi',
      context: 'spec',
      isUnsynced: false
    });

    overrideOptions = {
      visitor: visitor,
      assignment: assignment,
      username: 'the_username',
      password: 'the_password'
    };

    override = createOverride();
  });

  afterEach(() => {
    mockClient.reset();
  });

  it('requires a visitor', () => {
    // @ts-expect-error Testing deletion of required property
    delete overrideOptions.visitor;
    expect(() => createOverride()).toThrow('must provide visitor');
  });

  it('requires an assignment', () => {
    // @ts-expect-error Testing deletion of required property
    delete overrideOptions.assignment;
    expect(() => createOverride()).toThrow('must provide assignment');
  });

  it('requires an username', () => {
    // @ts-expect-error Testing deletion of required property
    delete overrideOptions.username;
    expect(() => createOverride()).toThrow('must provide username');
  });

  it('requires a password', () => {
    // @ts-expect-error Testing deletion of required property
    delete overrideOptions.password;
    expect(() => createOverride()).toThrow('must provide password');
  });

  describe('#persistAssignment()', () => {
    it('creates an assignment on the test track server', async () => {
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
      mockClient.reset();
      mockClient.onPost().reply(500);

      await override.persistAssignment();
      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith(
        'test_track persistAssignment response error: 500, undefined, undefined'
      );
    });

    it('logs an error on a network error', async () => {
      mockClient.reset();
      mockClient.onPost().networkError();

      await override.persistAssignment();
      expect(visitor.logError).toHaveBeenCalledTimes(1);
      expect(visitor.logError).toHaveBeenCalledWith('test_track persistAssignment other error: Error: Network Error');
    });
  });
});
