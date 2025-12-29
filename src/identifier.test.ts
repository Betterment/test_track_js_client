import Assignment from './assignment';
import Identifier from './identifier';
import Visitor from './visitor';
import client from './api';
import MockAdapter from 'axios-mock-adapter';

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev'
  };
});

jest.mock('./visitor');

const mockClient = new MockAdapter(client);

describe('Identifier', () => {
  let identifier: Identifier;
  let identifierOptions: ConstructorParameters<typeof Identifier>[0];

  function createIdentifier() {
    return new Identifier(identifierOptions);
  }

  beforeEach(() => {
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

    identifier = createIdentifier();
  });

  afterEach(() => {
    mockClient.reset();
  });

  it('requires a visitorId', () => {
    // @ts-expect-error Testing deletion of required property
    delete identifierOptions.visitorId;
    expect(() => createIdentifier()).toThrow('must provide visitorId');
  });

  it('requires a identifierType', () => {
    // @ts-expect-error Testing deletion of required property
    delete identifierOptions.identifierType;
    expect(() => createIdentifier()).toThrow('must provide identifierType');
  });

  it('requires a value', () => {
    // @ts-expect-error Testing deletion of required property
    delete identifierOptions.value;
    expect(() => createIdentifier()).toThrow('must provide value');
  });

  describe('#save()', () => {
    it('hits the test track server with the correct parameters', async () => {
      await identifier.save();
      expect(mockClient.history.post.length).toBe(1);
      expect(mockClient.history.post[0].url).toEqual(expect.stringContaining('/v1/identifier'));
      expect(mockClient.history.post[0].data).toEqual(
        'identifier_type=myappdb_user_id&value=444&visitor_id=transient_visitor_id'
      );
    });

    it('responds with a Visitor instance with the attributes from the server', async () => {
      const jabbaAssignment = new Assignment({
          splitName: 'jabba',
          variant: 'puppet',
          context: 'mos_eisley',
          isUnsynced: true
        }),
        wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

      await identifier.save();
      expect(Visitor).toHaveBeenCalledTimes(1);
      expect(Visitor).toHaveBeenCalledWith({
        id: 'actual_visitor_id',
        assignments: [jabbaAssignment, wineAssignment]
      });
    });
  });
});
