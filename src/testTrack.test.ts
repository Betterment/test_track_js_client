import type { Assignment } from './visitor';
import { sendAssignmentNotification } from './assignmentNotification';
import { getAssignmentBucket } from './calculateVariant';
import { TestTrack } from './testTrack';
import { http, HttpResponse } from 'msw';
import { server, getRequests } from './setupTests';
import type { AnalyticsProvider } from './analyticsProvider';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';
import type { StorageProvider } from './storageProvider';

vi.mock('./assignmentNotification');
vi.mock('./calculateVariant', async () => {
  const actual = await vi.importActual('./calculateVariant');
  return { ...actual, getAssignmentBucket: vi.fn() };
});

const mockGetAssignmentBucket = vi.mocked(getAssignmentBucket);
const mockSendAssignmentNotification = vi.mocked(sendAssignmentNotification);

const client = createClient({ url: 'http://testtrack.dev' });
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
      assignments: assignments ?? [{ splitName: 'jabba', variant: 'puppet', context: null, isUnsynced: false }]
    }
  });
}

function createOfflineTestTrack() {
  return new TestTrack({
    client,
    storage,
    splitRegistry: emptySplitRegistry,
    errorLogger,
    analytics,
    visitor: { id: 'offline_visitor_id', assignments: [] },
    isOffline: true
  });
}

describe('TestTrack', () => {
  describe('.vary()', () => {
    function varyJabbaSplit(testTrack: TestTrack) {
      return testTrack.vary('jabba', {
        context: 'spec',
        defaultVariant: 'cgi'
      });
    }

    function varyWineSplit(testTrack: TestTrack) {
      return testTrack.vary('wine', {
        context: 'spec',
        defaultVariant: 'white'
      });
    }

    beforeEach(() => {
      // Assignment bucket 25 will select: red (wine), puppet (jabba), false (blue_button)
      mockGetAssignmentBucket.mockReturnValue(25);
    });

    describe('New Assignment', () => {
      it('generates a new assignment via calculateVariant', () => {
        const testTrack = createTestTrack();

        const result = testTrack.vary('wine', {
          context: 'spec',
          defaultVariant: 'white'
        });

        expect(result).toBe('red');
        expect(mockGetAssignmentBucket).toHaveBeenCalledWith({
          visitorId: 'EXISTING_VISITOR_ID',
          splitName: 'wine'
        });
      });

      it('adds new assignments to the assignment registry', () => {
        const testTrack = createTestTrack();
        const result = varyWineSplit(testTrack);

        expect(result).toBe('red');
        expect(testTrack.assignments).toEqual([
          { splitName: 'jabba', variant: 'puppet', context: null, isUnsynced: false },
          { splitName: 'wine', variant: 'red', context: 'spec', isUnsynced: false }
        ]);
      });

      it('sends an AssignmentNotification', () => {
        const testTrack = createTestTrack();
        const result = varyWineSplit(testTrack);

        expect(result).toBe('red');
        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics,
          assignment: {
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          },
          errorLogger
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      });

      it('returns the variant from calculateVariant', () => {
        const testTrack = createTestTrack();

        const result = testTrack.vary('wine', {
          context: 'spec',
          defaultVariant: 'white'
        });

        expect(result).toBe('red');
      });

      it('logs an error if the AssignmentNotification throws an error', () => {
        const testTrack = createTestTrack();

        mockSendAssignmentNotification.mockImplementationOnce(() => {
          throw new Error('something bad happened');
        });

        varyWineSplit(testTrack);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics,
          assignment: {
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          },
          errorLogger
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
        expect(errorLogger).toHaveBeenCalledWith('test_track notify error: Error: something bad happened');
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
        const testTrack = createTestTrack();
        const result = varyJabbaSplit(testTrack);

        expect(result).toBe('puppet');
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });

      it('sends an AssignmentNotification with the default if it is defaulted', () => {
        const testTrack = createTestTrack();

        const result = testTrack.vary('element', {
          context: 'defaulted',
          defaultVariant: 'fire'
        });

        expect(result).toBe('fire');
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics,
          assignment: {
            splitName: 'element',
            variant: 'fire',
            context: 'defaulted',
            isUnsynced: true
          },
          errorLogger
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalled();
      });
    });

    describe('Offline TestTrack', () => {
      it('generates a new assignment via calculateVariant', () => {
        const testTrack = createOfflineTestTrack();
        const result = varyJabbaSplit(testTrack);

        expect(result).toBe('cgi');
        expect(mockGetAssignmentBucket).toHaveBeenCalledWith({
          visitorId: 'offline_visitor_id',
          splitName: 'jabba'
        });
      });

      it('does not send an AssignmentNotification', () => {
        const testTrack = createOfflineTestTrack();
        const result = varyWineSplit(testTrack);

        expect(result).toBe('white');
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });
    });

    describe('Receives a null variant from calculateVariant', () => {
      it('adds the assignment to the assignment registry', () => {
        // Empty split registry returns null from calculateVariant
        const testTrack = createOfflineTestTrack();
        const result = varyWineSplit(testTrack);

        expect(result).toBe('white');
        expect(testTrack.assignments).toEqual([
          { splitName: 'wine', variant: 'white', context: 'spec', isUnsynced: true }
        ]);
      });

      it('does not send an AssignmentNotification', () => {
        // Empty split registry returns null from calculateVariant
        const testTrack = createOfflineTestTrack();
        const result = varyWineSplit(testTrack);

        expect(result).toBe('white');
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
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
            context: null,
            isUnsynced: false
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
            context: null,
            isUnsynced: false
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
            context: null,
            isUnsynced: false
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
            context: null,
            isUnsynced: false
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
        http.post('http://testtrack.dev/api/v1/identifier', () => {
          return HttpResponse.json({
            visitor: {
              id: 'actual_visitor_id',
              assignments: [
                { split_name: 'jabba', variant: 'cgi', context: 'mos_eisley', unsynced: false },
                { split_name: 'wine', variant: 'red', context: 'spec', unsynced: true }
              ]
            }
          });
        })
      );
    });

    it('links identifier, overrides assignments, and updates visitor', async () => {
      const testTrack = createTestTrack([
        { splitName: 'jabba', variant: 'puppet', context: null, isUnsynced: true },
        { splitName: 'element', variant: 'earth', context: null, isUnsynced: true }
      ]);

      await testTrack[method]('myappdb_user_id', 444);

      expect(await getRequests()).toEqual([
        {
          method: 'POST',
          url: 'http://testtrack.dev/api/v1/identifier',
          body: { visitor_id: 'EXISTING_VISITOR_ID', identifier_type: 'myappdb_user_id', value: '444' }
        }
      ]);

      expect(testTrack.visitorId).toBe('actual_visitor_id');
      expect(storage.setVisitorId).toHaveBeenCalledWith('actual_visitor_id');
      expect(analytics[analyticsMethod]).toHaveBeenCalledWith('actual_visitor_id');

      expect(testTrack.assignments).toEqual([
        { splitName: 'jabba', variant: 'cgi', context: 'mos_eisley', isUnsynced: false },
        { splitName: 'element', variant: 'earth', context: null, isUnsynced: false },
        { splitName: 'wine', variant: 'red', context: 'spec', isUnsynced: false }
      ]);

      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        visitorId: 'actual_visitor_id',
        analytics,
        assignment: { splitName: 'wine', variant: 'red', context: 'spec', isUnsynced: true },
        errorLogger
      });
    });
  });

  describe('unsynced assignments', () => {
    it('notifies unsynced assignments when vary is called', () => {
      const wineAssignment: Assignment = { splitName: 'wine', variant: 'red', context: null, isUnsynced: false };
      const blueButtonAssignment: Assignment = {
        splitName: 'blue_button',
        variant: 'true',
        context: null,
        isUnsynced: true
      };
      const testTrack = new TestTrack({
        client,
        storage,
        analytics,
        errorLogger,
        splitRegistry: emptySplitRegistry,
        visitor: { id: 'unsynced_visitor_id', assignments: [wineAssignment, blueButtonAssignment] }
      });

      mockSendAssignmentNotification.mockClear();
      const result = testTrack.vary('wine', { context: 'context', defaultVariant: 'red' });

      expect(result).toBe('red');
      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        analytics,
        visitorId: 'unsynced_visitor_id',
        assignment: blueButtonAssignment,
        errorLogger
      });
    });
  });
});
