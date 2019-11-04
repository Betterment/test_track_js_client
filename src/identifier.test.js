import Assignment from './assignment';
import Identifier from './identifier';
import TestTrackConfig from './testTrackConfig'; // eslint-disable-line no-unused-vars
import Visitor from './visitor'; // eslint-disable-line no-unused-vars
import client from './api';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

jest.mock('./visitor');

describe('Identifier', () => {
  let identifierOptions;
  function createIdentifier() {
    return new Identifier(identifierOptions);
  }

  let testContext;
  beforeEach(() => {
    testContext = {};
    client.post = jest.fn().mockResolvedValue({
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
    it('hits the test track server with the correct parameters', done => {
      testContext.identifier.save().then(function() {
        expect(client.post).toHaveBeenCalledTimes(1);
        expect(client.post).toHaveBeenCalledWith(
          'http://testtrack.dev/api/v1/identifier',
          {
            identifier_type: 'myappdb_user_id',
            value: 444,
            visitor_id: 'transient_visitor_id'
          },
          { crossDomain: true }
        );

        done();
      });
    });

    it('responds with a Visitor instance with the attributes from the server', done => {
      var jabbaAssignment = new Assignment({
          splitName: 'jabba',
          variant: 'puppet',
          context: 'mos_eisley',
          isUnsynced: true
        }),
        wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

      testContext.identifier.save().then(function() {
        expect(Visitor).toHaveBeenCalledTimes(1);
        expect(Visitor).toHaveBeenCalledWith({
          id: 'actual_visitor_id',
          assignments: [jabbaAssignment, wineAssignment]
        });

        done();
      });
    });
  });
});
