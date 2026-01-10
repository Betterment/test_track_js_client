import type { Assignment } from './assignment';
import { v4 as uuid } from 'uuid';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';
import { loadVisitor } from './visitor';

vi.mock('uuid');

const client = createClient({ url: 'http://testtrack.dev' });
const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  }
]);

describe('loadVisitor()', () => {
  beforeEach(() => {
    server.use(
      http.get('http://testtrack.dev/api/v1/visitors/server_visitor_id', () => {
        return HttpResponse.json({
          id: 'server_visitor_id',
          assignments: [
            {
              split_name: 'jabba',
              variant: 'puppet',
              unsynced: false
            }
          ]
        });
      }),
      http.get('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id', () => {
        return HttpResponse.json({
          id: 'puppeteer_visitor_id',
          assignments: [
            {
              split_name: 'jabba',
              variant: 'puppet',
              context: 'mos_eisley',
              unsynced: false
            }
          ]
        });
      })
    );
  });

  it('does not hit the server when not passed a visitorId', async () => {
    // @ts-expect-error `uuid` has overloads
    vi.mocked(uuid).mockReturnValue('generated_uuid');

    const result = await loadVisitor({
      client,
      splitRegistry,
      id: undefined,
      assignments: null
    });
    expect(requests.length).toBe(0);
    expect(result).toEqual({
      visitor: { id: 'generated_uuid', assignments: [] },
      isOffline: false
    });
  });

  it('does not hit the server when passed a visitorId and there are baked assignments', async () => {
    const jabbaAssignment: Assignment = {
      splitName: 'jabba',
      variant: 'puppet',
      context: null,
      isUnsynced: false
    };

    const wineAssignment: Assignment = {
      splitName: 'wine',
      variant: 'rose',
      context: null,
      isUnsynced: false
    };

    const result = await loadVisitor({
      client,
      splitRegistry,
      id: 'baked_visitor_id',
      assignments: [jabbaAssignment, wineAssignment]
    });

    expect(result).toEqual({
      visitor: { id: 'baked_visitor_id', assignments: [jabbaAssignment, wineAssignment] },
      isOffline: false
    });

    expect(requests.length).toBe(0);
  });

  it('loads a visitor from the server for an existing visitor if there are no baked assignments', async () => {
    const jabbaAssignment: Assignment = {
      splitName: 'jabba',
      variant: 'puppet',
      context: 'mos_eisley',
      isUnsynced: false
    };

    const result = await loadVisitor({
      client,
      splitRegistry,
      id: 'puppeteer_visitor_id',
      assignments: null
    });

    expect(result).toEqual({
      visitor: { id: 'puppeteer_visitor_id', assignments: [jabbaAssignment] },
      isOffline: false
    });

    expect(requests.length).toBe(1);
    expect(requests[0]!.url).toEqual('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id');
  });

  it('builds a visitor in offline mode if the request fails', async () => {
    server.use(
      http.get('http://testtrack.dev/api/v1/visitors/failed_visitor_id', () => {
        return HttpResponse.error();
      })
    );

    const result = await loadVisitor({
      client,
      splitRegistry,
      id: 'failed_visitor_id',
      assignments: null
    });

    expect(result).toEqual({
      visitor: { id: 'failed_visitor_id', assignments: [] },
      isOffline: true
    });

    expect(requests.length).toBe(1);
    expect(requests[0]!.url).toEqual('http://testtrack.dev/api/v1/visitors/failed_visitor_id');
  });
});
