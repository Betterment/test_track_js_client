import type { Assignment } from './visitor';
import { indexAssignments, parseAssignment, loadVisitor } from './visitor';
import { v4 as uuid } from 'uuid';
import { http, HttpResponse } from 'msw';
import { server, getRequests } from './setupTests';
import { createClient } from './client';

vi.mock('uuid');

const client = createClient({ url: 'http://testtrack.dev' });

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

    const result = await loadVisitor({ client, id: undefined, assignments: null });
    expect(result).toEqual({ id: 'generated_uuid', assignments: [] });
    expect(await getRequests()).toEqual([]);
  });

  it('does not hit the server when passed a visitorId and there are baked assignments', async () => {
    const jabbaAssignment: Assignment = {
      splitName: 'jabba',
      variant: 'puppet',
      context: null
    };

    const wineAssignment: Assignment = {
      splitName: 'wine',
      variant: 'rose',
      context: null
    };

    const result = await loadVisitor({
      client,
      id: 'baked_visitor_id',
      assignments: [jabbaAssignment, wineAssignment]
    });

    expect(result).toEqual({ id: 'baked_visitor_id', assignments: [jabbaAssignment, wineAssignment] });
    expect(await getRequests()).toEqual([]);
  });

  it('loads a visitor from the server for an existing visitor if there are no baked assignments', async () => {
    const jabbaAssignment: Assignment = {
      splitName: 'jabba',
      variant: 'puppet',
      context: 'mos_eisley'
    };

    const result = await loadVisitor({ client, id: 'puppeteer_visitor_id', assignments: null });
    expect(result).toEqual({ id: 'puppeteer_visitor_id', assignments: [jabbaAssignment] });
    expect(await getRequests()).toEqual([
      { method: 'GET', url: 'http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id', body: null }
    ]);
  });

  it('builds a visitor in offline mode if the request fails', async () => {
    server.use(
      http.get('http://testtrack.dev/api/v1/visitors/failed_visitor_id', () => {
        return HttpResponse.error();
      })
    );

    const result = await loadVisitor({ client, id: 'failed_visitor_id', assignments: null });
    expect(result).toEqual({ id: 'failed_visitor_id', assignments: [] });
    expect(await getRequests()).toEqual([
      { method: 'GET', url: 'http://testtrack.dev/api/v1/visitors/failed_visitor_id', body: null }
    ]);
  });
});

describe('parseAssignment', () => {
  it('parses V1 API data', () => {
    const assignment = parseAssignment({
      split_name: 'button_color',
      variant: 'red',
      context: 'homepage',
      unsynced: false
    });

    expect(assignment.splitName).toBe('button_color');
    expect(assignment.variant).toBe('red');
  });
});

describe('indexAssignments', () => {
  it('indexes assignments by splitName', () => {
    const a: Assignment = { splitName: 'a', variant: 'true', context: null };
    const b: Assignment = { splitName: 'b', variant: 'true', context: null };

    expect(indexAssignments([a, b])).toEqual({ a, b });
  });
});
