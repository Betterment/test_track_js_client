import { http, HttpResponse } from 'msw';
import { TestTrack } from './testTrack';
import { getAssignmentBucket } from './calculateVariant';
import { server, getRequests } from './setupTests';
import { createClient, type V4VisitorConfig } from './client';
import { createSplitRegistry } from './splitRegistry';
import type { Assignment } from './visitor';
import type { AnalyticsProvider } from './analyticsProvider';
import type { StorageProvider } from './storageProvider';

vi.mock('./calculateVariant', async () => {
  const actual = await vi.importActual('./calculateVariant');
  return { ...actual, getAssignmentBucket: vi.fn() };
});

const mockGetAssignmentBucket = vi.mocked(getAssignmentBucket);

const client = createClient({
  url: 'http://testtrack.dev',
  appName: 'test_app',
  appVersion: '1.0.0',
  buildTimestamp: '2019-04-16T14:35:30Z'
});

const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  { name: 'element', isFeatureGate: false, weighting: { earth: 25, wind: 25, fire: 25, water: 25 } },
  { name: 'jabba', isFeatureGate: false, weighting: { puppet: 50, cgi: 50 } },
  { name: 'wine', isFeatureGate: false, weighting: { red: 50, white: 50 } },
  { name: 'blue_button', isFeatureGate: true, weighting: { true: 50, false: 50 } }
]);

const errorLogger = vi.fn();

const storage: StorageProvider = {
  getVisitorId: vi.fn(),
  setVisitorId: vi.fn()
};

const analytics: AnalyticsProvider = {
  alias: vi.fn(),
  identify: vi.fn(),
  trackAssignment: vi.fn()
};

function createTestTrack(assignments?: Assignment[]) {
  return new TestTrack({
    analytics,
    client,
    storage,
    splitRegistry,
    errorLogger,
    visitor: {
      id: 'EXISTING_VISITOR_ID',
      assignments: assignments ?? [{ splitName: 'jabba', variant: 'puppet', context: null }]
    }
  });
}

function createEmptySplitRegistryTestTrack() {
  return new TestTrack({
    client,
    storage,
    splitRegistry: emptySplitRegistry,
    errorLogger,
    analytics,
    visitor: { id: 'offline_visitor_id', assignments: [] }
  });
}

describe('TestTrack', () => {
  beforeEach(() => {
    server.use(
      http.post('http://testtrack.dev/api/v1/assignment_event', () => {
        return HttpResponse.json(null, { status: 200 });
      })
    );
  });

  describe('.vary()', () => {
    beforeEach(() => {
      // Assignment bucket 25 will select: red (wine), puppet (jabba), false (blue_button)
      mockGetAssignmentBucket.mockReturnValue(25);
    });

    describe('New Assignment', () => {
      it('generates a new assignment via calculateVariant', () => {
        const testTrack = createTestTrack();
        const result = testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        expect(result).toBe('red');
        expect(mockGetAssignmentBucket).toHaveBeenCalledWith({
          visitorId: 'EXISTING_VISITOR_ID',
          splitName: 'wine'
        });
      });

      it('adds new assignments to the assignment registry', () => {
        const testTrack = createTestTrack();
        const result = testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        expect(result).toBe('red');
        expect(testTrack.assignments).toEqual([
          { splitName: 'jabba', variant: 'puppet', context: null },
          { splitName: 'wine', variant: 'red', context: 'spec' }
        ]);
      });

      it('sends an AssignmentNotification', async () => {
        const testTrack = createTestTrack();
        const result = testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        expect(result).toBe('red');
        expect(analytics.trackAssignment).toHaveBeenCalledTimes(1);

        await expect.poll(getRequests).toContainEqual({
          method: 'POST',
          url: 'http://testtrack.dev/api/v1/assignment_event',
          body: { visitor_id: 'EXISTING_VISITOR_ID', split_name: 'wine', context: 'spec' }
        });
      });

      it('uses the defaultVariant when the split registry is not loaded', () => {
        const testTrack = createEmptySplitRegistryTestTrack();
        const result = testTrack.vary('jabba', { context: 'spec', defaultVariant: 'cgi' });

        expect(result).toBe('cgi');
      });

      it('logs an error if the HTTP request fails', async () => {
        server.use(
          http.post('http://testtrack.dev/api/v1/assignment_event', () => {
            return HttpResponse.json(null, { status: 500 });
          })
        );

        const testTrack = createTestTrack();
        testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        await expect
          .poll(() => errorLogger)
          .toHaveBeenCalledWith('test_track persistAssignment error: Error: HTTP request failed with 500 status');
      });

      it('logs an error if analytics.trackAssignment throws', async () => {
        vi.spyOn(analytics, 'trackAssignment').mockImplementationOnce(() => {
          throw new Error('analytics error');
        });

        const testTrack = createTestTrack();
        testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        expect(errorLogger).toHaveBeenCalledWith('test_track trackAssignment error: Error: analytics error');

        await expect.poll(getRequests).toContainEqual({
          method: 'POST',
          url: 'http://testtrack.dev/api/v1/assignment_event',
          body: { visitor_id: 'EXISTING_VISITOR_ID', split_name: 'wine', context: 'spec' }
        });
      });
    });

    describe('Existing Assignment', () => {
      it('returns an existing assignment wihout generating', () => {
        const testTrack = createTestTrack();

        const result = testTrack.vary('jabba', {
          context: 'spec',
          defaultVariant: 'cgi'
        });

        expect(result).toBe('puppet');
      });

      it('does not send an AssignmentNotification', () => {
        const postAssignmentEventSpy = vi.spyOn(client, 'postAssignmentEvent');
        const testTrack = createTestTrack();
        const result = testTrack.vary('jabba', { context: 'spec', defaultVariant: 'cgi' });

        expect(result).toBe('puppet');
        expect(analytics.trackAssignment).not.toHaveBeenCalled();
        expect(postAssignmentEventSpy).not.toHaveBeenCalled();
      });

      it('calculates and notifies when existing assignment has a null variant', async () => {
        const testTrack = createTestTrack([{ splitName: 'wine', variant: null, context: null }]);
        const result = testTrack.vary('wine', { context: 'spec', defaultVariant: 'white' });

        expect(result).toBe('red');
        expect(analytics.trackAssignment).toHaveBeenCalledTimes(1);

        await expect.poll(getRequests).toContainEqual({
          method: 'POST',
          url: 'http://testtrack.dev/api/v1/assignment_event',
          body: { visitor_id: 'EXISTING_VISITOR_ID', split_name: 'wine', context: 'spec' }
        });
      });
    });

    describe('Boolean split', () => {
      it('returns the correct variant when given a true boolean', () => {
        mockGetAssignmentBucket.mockReturnValue(75); // Selects 'true'
        const testTrack = createTestTrack();
        const result = testTrack.vary('blue_button', { context: 'spec', defaultVariant: true });

        expect(result).toBe('true');
      });

      it('returns the correct variant when given a false boolean', () => {
        mockGetAssignmentBucket.mockReturnValue(25); // Selects 'false'
        const testTrack = createTestTrack();

        const result = testTrack.vary('blue_button', {
          context: 'spec',
          defaultVariant: false
        });

        expect(result).toBe('false');
      });
    });

    it('does not send an AssignmentNotification for feature gates', async () => {
      mockGetAssignmentBucket.mockReturnValue(25); // Selects 'false'
      const postAssignmentEventSpy = vi.spyOn(client, 'postAssignmentEvent');
      const testTrack = createTestTrack();
      const result = testTrack.vary('blue_button', { context: 'spec', defaultVariant: false });

      expect(result).toBe('false');
      expect(analytics.trackAssignment).not.toHaveBeenCalled();
      expect(postAssignmentEventSpy).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(await getRequests()).toEqual([]);
    });

    it('does not send an AssignmentNotification for unknown splits', async () => {
      mockGetAssignmentBucket.mockReturnValue(50);
      const postAssignmentEventSpy = vi.spyOn(client, 'postAssignmentEvent');
      const testTrack = createEmptySplitRegistryTestTrack();
      const result = testTrack.vary('unknown_split', { context: 'spec', defaultVariant: 'default' });

      expect(result).toBe('default');
      expect(analytics.trackAssignment).not.toHaveBeenCalled();
      expect(postAssignmentEventSpy).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(await getRequests()).toEqual([]);
    });
  });

  describe('.ab()', () => {
    it('leverages vary to configure the split', () => {
      const testTrack = createTestTrack();
      expect(testTrack.ab('jabba', { context: 'spec', trueVariant: 'puppet' })).toBe(true);
    });

    describe('with an explicit trueVariant', () => {
      it('returns true when assigned to the trueVariant', () => {
        const testTrack = createTestTrack([
          {
            splitName: 'jabba',
            variant: 'puppet',
            context: null
          }
        ]);

        const result = testTrack.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet'
        });

        expect(result).toBe(true);
      });

      it('returns false when not assigned to the trueVariant', () => {
        const testTrack = createTestTrack([
          {
            splitName: 'jabba',
            variant: 'cgi',
            context: null
          }
        ]);

        const result = testTrack.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet'
        });

        expect(result).toBe(false);
      });
    });

    describe('with an implicit trueVariant', () => {
      it('returns true when variant is true', () => {
        const testTrack = createTestTrack([
          {
            splitName: 'blue_button',
            variant: 'true',
            context: null
          }
        ]);

        const result = testTrack.ab('blue_button', { context: 'spec' });

        expect(result).toBe(true);
      });

      it('returns false when variant is false', () => {
        const testTrack = createTestTrack([
          {
            splitName: 'blue_button',
            variant: 'false',
            context: null
          }
        ]);

        const result = testTrack.ab('blue_button', { context: 'spec' });

        expect(result).toBe(false);
      });

      it('returns false when split variants are not true and false', () => {
        const testTrack = createTestTrack();

        const result = testTrack.ab('jabba', { context: 'spec' });

        expect(result).toBe(false);
      });
    });
  });

  describe.each([
    { method: 'logIn' as const, analyticsMethod: 'identify' as const },
    { method: 'signUp' as const, analyticsMethod: 'alias' as const }
  ])('.$method()', ({ method, analyticsMethod }) => {
    beforeEach(() => {
      server.use(
        http.post(
          'http://testtrack.dev/api/v4/apps/test_app/versions/1.0.0/builds/2019-04-16T14:35:30Z/identifier',
          () => {
            return HttpResponse.json<V4VisitorConfig>({
              splits: [],
              visitor: {
                id: 'actual_visitor_id',
                assignments: [
                  { split_name: 'jabba', variant: 'cgi' },
                  { split_name: 'wine', variant: 'red' }
                ]
              },
              experience_sampling_weight: 10
            });
          }
        )
      );
    });

    it('links identifier, overrides assignments, and updates visitorId', async () => {
      const testTrack = createTestTrack([
        { splitName: 'jabba', variant: 'puppet', context: null },
        { splitName: 'element', variant: 'earth', context: null }
      ]);

      await testTrack[method]('myappdb_user_id', 444);

      expect(await getRequests()).toEqual([
        {
          method: 'POST',
          url: 'http://testtrack.dev/api/v4/apps/test_app/versions/1.0.0/builds/2019-04-16T14:35:30Z/identifier',
          body: { visitor_id: 'EXISTING_VISITOR_ID', identifier_type: 'myappdb_user_id', value: '444' }
        }
      ]);

      expect(testTrack.visitorId).toBe('actual_visitor_id');
      expect(storage.setVisitorId).toHaveBeenCalledWith('actual_visitor_id');
      expect(analytics[analyticsMethod]).toHaveBeenCalledWith('actual_visitor_id');

      expect(testTrack.assignments).toEqual([
        { splitName: 'jabba', variant: 'cgi', context: null },
        { splitName: 'element', variant: 'earth', context: null },
        { splitName: 'wine', variant: 'red', context: null }
      ]);
    });
  });
});
