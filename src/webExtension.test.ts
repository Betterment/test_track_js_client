import { Assignment } from './assignment';
import { createWebExtension } from './webExtension';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';

const client = createClient({ url: 'http://testtrack.dev' });

const splitRegistry = createSplitRegistry([
  { name: 'jabba', isFeatureGate: true, weighting: { cgi: 50, puppet: 50 } },
  { name: 'wine', isFeatureGate: false, weighting: { red: 50, white: 25, rose: 25 } }
]);

const assignments = [
  new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false }),
  new Assignment({ splitName: 'wine', variant: 'rose', isUnsynced: false })
];

describe('createWebExtension', () => {
  describe('.persistAssignment()', () => {
    beforeEach(() => {
      server.use(
        http.post('http://testtrack.dev/api/v1/assignment_override', () => {
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
        logError: () => {}
      });

      await webExtension.persistAssignment('split', 'variant', 'the_username', 'the_password');

      expect(requests.length).toBe(1);
      expect(requests[0]!.url).toEqual('http://testtrack.dev/api/v1/assignment_override');
      expect(await requests[0]!.text()).toEqual(
        'visitor_id=existing_visitor_id&split_name=split&variant=variant&context=chrome_extension&mixpanel_result=success'
      );
      expect(requests[0]!.headers.get('authorization')).toEqual(`Basic ${btoa('the_username:the_password')}`);
    });

    it('logs an error on an error response', async () => {
      server.use(
        http.post('http://testtrack.dev/api/v1/assignment_override', () => {
          return HttpResponse.json(null, { status: 500 });
        })
      );

      const errorLogger = vi.fn();
      const webExtension = createWebExtension({
        client,
        visitorId: 'existing_visitor_id',
        splitRegistry,
        assignments,
        logError: errorLogger
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
        logError: () => {}
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
