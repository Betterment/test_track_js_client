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

describe('AssignmentOverride', () => {
  let overrideOptions;
  function createOverride() {
    return new AssignmentOverride(overrideOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    mockClient.onPost('/v1/assignment_override').reply(200);

    testContext.visitor = new Visitor({
      id: 'visitorId',
      assignments: []
    });
    testContext.visitor.logError = jest.fn();

    testContext.assignment = new Assignment({
      splitName: 'jabba',
      variant: 'cgi',
      context: 'spec',
      isUnsynced: false
    });

    overrideOptions = {
      visitor: testContext.visitor,
      assignment: testContext.assignment,
      username: 'the_username',
      password: 'the_password'
    };

    testContext.override = createOverride();
  });

  afterEach(() => {
    mockClient.reset();
  });

  it('requires a visitor', () => {
    expect(function() {
      delete overrideOptions.visitor;
      createOverride();
    }).toThrow('must provide visitor');
  });

  it('requires an assignment', () => {
    expect(function() {
      delete overrideOptions.assignment;
      createOverride();
    }).toThrow('must provide assignment');
  });

  it('requires an username', () => {
    expect(function() {
      delete overrideOptions.username;
      createOverride();
    }).toThrow('must provide username');
  });

  it('requires a password', () => {
    expect(function() {
      delete overrideOptions.password;
      createOverride();
    }).toThrow('must provide password');
  });

  describe('#persistAssignment()', () => {
    it('creates an assignment on the test track server', () => {
      return testContext.override.persistAssignment().then(() => {
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
    });

    it('logs an error on an error response', () => {
      mockClient.reset();
      mockClient.onPost().reply(500);

      return testContext.override.persistAssignment().then(() => {
        expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment response error: 500, undefined, undefined'
        );
      });
    });

    it('logs an error on a network error', () => {
      mockClient.reset();
      mockClient.onPost().networkError();

      return testContext.override.persistAssignment().then(() => {
        expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment other error: Error: Network Error'
        );
      });
    });
  });
});
