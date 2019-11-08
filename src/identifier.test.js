import Assignment from './assignment';
import Identifier from './identifier';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';
import qs from 'qs';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

jest.mock('./visitor');

const mockClient = new MockAdapter(client);

describe('Identifier', () => {
  let identifierOptions;
  function createIdentifier() {
    return new Identifier(identifierOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    mockClient.onPost('/v1/identifier').reply(200, {
      visitor: {
        id: 'actual_visitor_id',
        assignments: [
          {
            split_name: 'jabba',
            variant: 'puppet',
            context: 'mos_eisley',
            unsynced: true
          },
          {
            split_name: 'wine',
            variant: 'red',
            context: 'napa',
            unsynced: false
          }
        ]
      }
    });

    identifierOptions = {
      visitorId: 'transient_visitor_id',
      identifierType: 'myappdb_user_id',
      value: 444
    };

    testContext.identifier = createIdentifier();
  });

  afterEach(() => {
    mockClient.reset();
  });

  it('requires a visitorId', () => {
    expect(function() {
      delete identifierOptions.visitorId;
      createIdentifier();
    }).toThrow('must provide visitorId');
  });

  it('requires a identifierType', () => {
    expect(function() {
      delete identifierOptions.identifierType;
      createIdentifier();
    }).toThrow('must provide identifierType');
  });

  it('requires a value', () => {
    expect(function() {
      delete identifierOptions.value;
      createIdentifier();
    }).toThrow('must provide value');
  });

  describe('#save()', () => {
    it('hits the test track server with the correct parameters', () => {
      return testContext.identifier.save().then(function() {
        expect(mockClient.history.post.length).toBe(1);
        expect(mockClient.history.post[0].url).toEqual(expect.stringContaining('/v1/identifier'));
        expect(mockClient.history.post[0].data).toEqual(
          qs.stringify({
            identifier_type: 'myappdb_user_id',
            value: 444,
            visitor_id: 'transient_visitor_id'
          })
        );
      });
    });

    it('responds with a Visitor instance with the attributes from the server', () => {
      var jabbaAssignment = new Assignment({
          splitName: 'jabba',
          variant: 'puppet',
          context: 'mos_eisley',
          isUnsynced: true
        }),
        wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

      return testContext.identifier.save().then(function() {
        expect(Visitor).toHaveBeenCalledTimes(1);
        expect(Visitor).toHaveBeenCalledWith({
          id: 'actual_visitor_id',
          assignments: [jabbaAssignment, wineAssignment]
        });
      });
    });
  });
});
