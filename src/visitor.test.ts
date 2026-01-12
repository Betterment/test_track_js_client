import type { Assignment } from './visitor';
import { indexAssignments, parseAssignment, parseVisitorConfig, loadVisitorConfig } from './visitor';
import type { V4VisitorConfig } from './client';
import { http, HttpResponse } from 'msw';
import { server, getRequests } from './setupTests';
import { createClient } from './client';

vi.mock('uuid');

const client = createClient({
  url: 'http://testtrack.dev',
  appName: 'test_app',
  appVersion: '1.0.0',
  buildTimestamp: '2019-04-16T14:35:30Z'
});

describe('loadVisitorConfig()', () => {
  const buildURL = 'http://testtrack.dev/api/v4/apps/test_app/versions/1.0.0/builds/2019-04-16T14:35:30Z';

  beforeEach(() => {
    server.use(
      http.get(`${buildURL}/visitors/test_visitor_id/config`, () => {
        const visitorConfig: V4VisitorConfig = {
          splits: [
            {
              name: 'jabba',
              variants: [
                { name: 'cgi', weight: 50 },
                { name: 'puppet', weight: 50 }
              ],
              feature_gate: true
            }
          ],
          visitor: {
            id: 'test_visitor_id',
            assignments: [{ split_name: 'jabba', variant: 'puppet' }]
          },
          experience_sampling_weight: 1
        };
        return HttpResponse.json(visitorConfig);
      })
    );
  });

  it('loads visitor config from the V4 API', async () => {
    const result = await loadVisitorConfig(client, 'test_visitor_id');

    expect(result.visitor).toEqual({
      id: 'test_visitor_id',
      assignments: [{ splitName: 'jabba', variant: 'puppet', context: null }]
    });

    expect(result.splitRegistry.isLoaded).toBe(true);
    expect(result.splitRegistry.getSplit('jabba')).toEqual({
      name: 'jabba',
      isFeatureGate: true,
      weighting: { cgi: 50, puppet: 50 }
    });

    expect(await getRequests()).toEqual([
      { method: 'GET', url: `${buildURL}/visitors/test_visitor_id/config`, body: null }
    ]);
  });

  it('returns empty visitor config if the request fails', async () => {
    server.use(
      http.get(`${buildURL}/visitors/failed_visitor_id/config`, () => {
        return HttpResponse.error();
      })
    );

    const result = await loadVisitorConfig(client, 'failed_visitor_id');
    expect(result.visitor).toEqual({ id: 'failed_visitor_id', assignments: [] });
    expect(result.splitRegistry.isLoaded).toBe(false);

    expect(await getRequests()).toEqual([
      { method: 'GET', url: `${buildURL}/visitors/failed_visitor_id/config`, body: null }
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

describe('parseVisitorConfig', () => {
  it('parses V4 API visitor config data', () => {
    const v4VisitorConfig: V4VisitorConfig = {
      splits: [
        {
          name: 'jabba',
          variants: [
            { name: 'cgi', weight: 50 },
            { name: 'puppet', weight: 50 }
          ],
          feature_gate: true
        }
      ],
      visitor: {
        id: 'test_visitor_id',
        assignments: [{ split_name: 'jabba', variant: 'puppet' }]
      },
      experience_sampling_weight: 1
    };

    const { visitor, splitRegistry } = parseVisitorConfig(v4VisitorConfig);

    expect(visitor).toEqual({
      id: 'test_visitor_id',
      assignments: [{ splitName: 'jabba', variant: 'puppet', context: null }]
    });

    expect(splitRegistry.isLoaded).toBe(true);
    expect(splitRegistry.getSplit('jabba')).toEqual({
      name: 'jabba',
      isFeatureGate: true,
      weighting: { cgi: 50, puppet: 50 }
    });
  });
});
