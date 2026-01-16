import type { Assignment } from './visitor';
import { createWebExtension } from './webExtension';
import { http, HttpResponse } from 'msw';
import { server, getRequests } from './setupTests';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';

const client = createClient({
  url: 'http://testtrack.dev',
  appName: 'test_app',
  appVersion: '1.0.0',
  buildTimestamp: '2019-04-16T14:35:30Z'
});

const splitRegistry = createSplitRegistry([
  { name: 'jabba', isFeatureGate: true, weighting: { cgi: 50, puppet: 50 } },
  { name: 'wine', isFeatureGate: false, weighting: { red: 50, white: 25, rose: 25 } }
]);

const assignments: Assignment[] = [
  { splitName: 'jabba', variant: 'puppet', context: null },
  { splitName: 'wine', variant: 'rose', context: null }
];

describe('createWebExtension', () => {
  describe('.persistAssignment()', () => {
    beforeEach(() => {
      server.use(
        http.post('http://testtrack.dev/api/v2/visitors/:visitor_id/assignment_overrides', () => {
          return HttpResponse.json(null, { status: 200 });
        })
      );
    });

    it('creates an assignment override on the test track server', async () => {
      const webExtension = createWebExtension({
        client,
        visitorId: 'existing_visitor_id',
        splitRegistry,
        assignments,
        errorLogger: () => {}
      });

      await webExtension.persistAssignment('split', 'variant', 'the_username', 'the_password');

      expect(await getRequests()).toEqual([
        {
          method: 'POST',
          url: 'http://testtrack.dev/api/v2/visitors/existing_visitor_id/assignment_overrides',
          body: {
            assignments: [{ split_name: 'split', variant: 'variant', context: 'chrome_extension' }]
          }
        }
      ]);
    });

    it('logs an error on an error response', async () => {
      server.use(
        http.post('http://testtrack.dev/api/v2/visitors/:visitor_id/assignment_overrides', () => {
          return HttpResponse.json(null, { status: 500 });
        })
      );

      const errorLogger = vi.fn();
      const webExtension = createWebExtension({
        client,
        visitorId: 'existing_visitor_id',
        splitRegistry,
        assignments,
        errorLogger
      });

      await webExtension.persistAssignment('split', 'variant', 'the_username', 'the_password');
      expect(errorLogger).toHaveBeenCalledWith(
        'test_track persistAssignment error: Error: HTTP request failed with 500 status'
      );
    });
  });

  describe('.loadInfo()', () => {
    it('resolves with the visitor id, assignment registry, and split registry', async () => {
      const webExtension = createWebExtension({
        client,
        visitorId: 'existing_visitor_id',
        splitRegistry,
        assignments,
        errorLogger: () => {}
      });

      expect(await webExtension.loadInfo()).toEqual({
        visitorId: 'existing_visitor_id',
        splitRegistry: {
          jabba: { cgi: 50, puppet: 50 },
          wine: { red: 50, white: 25, rose: 25 }
        },
        assignmentRegistry: { jabba: 'puppet', wine: 'rose' }
      });
    });
  });
});
