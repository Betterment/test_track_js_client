import Assignment from './assignment';
import AssignmentOverride from './assignmentOverride';
import TestTrackConfig from './testTrackConfig'; // eslint-disable-line no-unused-vars
import Visitor from './visitor';
import client from './api';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

describe('AssignmentOverride', () => {
  let overrideOptions;
  function createOverride() {
    return new AssignmentOverride(overrideOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    client.post = jest.fn().mockResolvedValue(undefined);

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
      testContext.override.persistAssignment();

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.post).toHaveBeenCalledWith(
        '/assignment_override',
        {
          visitor_id: 'visitorId',
          split_name: 'jabba',
          variant: 'cgi',
          context: 'spec',
          mixpanel_result: 'success'
        },
        {
          crossDomain: true,
          headers: {
            Authorization: 'Basic dGhlX3VzZXJuYW1lOnRoZV9wYXNzd29yZA==' // Base64 of 'the_username:the_password'
          }
        }
      );
    });

    it('logs an error if the request fails', done => {
      client.post = jest.fn().mockRejectedValue({ response: { status: 500, statusText: 'Internal Server Error' } });

      return testContext.override.persistAssignment().then(() => {
        expect(testContext.visitor.logError).toHaveBeenCalledTimes(1);
        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track persistAssignment error: 500, Internal Server Error, undefined'
        );
        done();
      });
    });
  });
});
