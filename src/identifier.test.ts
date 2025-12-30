import Assignment from './assignment';
import Identifier from './identifier';
import Visitor from './visitor';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createConfig } from './test-utils';

vi.mock('./visitor');

function createIdentifier() {
  return new Identifier({
    config: createConfig(),
    visitorId: 'transient_visitor_id',
    identifierType: 'myappdb_user_id',
    value: 444
  });
}

describe('Identifier', () => {
  beforeEach(() => {
    server.use(
      http.post('https://testtrack.dev/api/v1/identifier', () => {
        return HttpResponse.json({
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
      })
    );
  });

  it('requires a visitorId', () => {
    expect(() => {
      // @ts-expect-error Testing missing required property
      new Identifier({ config: createConfig(), identifierType: 'myappdb_user_id', value: 444 });
    }).toThrow('must provide visitorId');
  });

  it('requires a identifierType', () => {
    expect(() => {
      // @ts-expect-error Testing missing required property
      new Identifier({ config: createConfig(), visitorId: 'visitorId', value: 444 });
    }).toThrow('must provide identifierType');
  });

  it('requires a value', () => {
    expect(() => {
      // @ts-expect-error Testing missing required property
      new Identifier({ config: createConfig(), visitorId: 'visitorId', identifierType: 'myappdb_user_id' });
    }).toThrow('must provide value');
  });

  describe('#save()', () => {
    it('hits the test track server with the correct parameters', async () => {
      const identifier = createIdentifier();
      await identifier.save();
      expect(requests.length).toBe(1);
      expect(requests[0].url).toEqual('https://testtrack.dev/api/v1/identifier');
      expect(await requests[0].text()).toEqual(
        'identifier_type=myappdb_user_id&value=444&visitor_id=transient_visitor_id'
      );
    });

    it('responds with a Visitor instance with the attributes from the server', async () => {
      const identifier = createIdentifier();
      const jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'puppet',
        context: 'mos_eisley',
        isUnsynced: true
      });
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

      await identifier.save();
      expect(Visitor).toHaveBeenCalledTimes(1);
      expect(Visitor).toHaveBeenCalledWith({
        id: 'actual_visitor_id',
        assignments: [jabbaAssignment, wineAssignment]
      });
    });
  });
});
