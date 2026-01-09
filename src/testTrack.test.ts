import { Assignment } from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
import { getAssignmentBucket } from './calculateVariant';
import { TestTrack } from './testTrack';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import type { AnalyticsProvider } from './analyticsProvider';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';

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

const storage = {
  getVisitorId: vi.fn(),
  setVisitorId: vi.fn()
};

function createTestTrack(assignments?: Assignment[]) {
  return new TestTrack({
    client,
    storage,
    splitRegistry,
    visitor: {
      id: 'EXISTING_VISITOR_ID',
      assignments: assignments ?? [new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false })]
    }
  });
}

function createOfflineTestTrack() {
  return new TestTrack({
    client,
    storage,
    splitRegistry: emptySplitRegistry,
    visitor: { id: 'offline_visitor_id', assignments: [] },
    isOffline: true
  });
}

describe('TestTrack', () => {
  describe('.vary()', () => {
    function varyJabbaSplit(testTrack: TestTrack) {
      testTrack.vary('jabba', {
        context: 'spec',
        variants: { puppet: vi.fn(), cgi: vi.fn() },
        defaultVariant: 'cgi'
      });
    }

    function varyWineSplit(testTrack: TestTrack) {
      testTrack.vary('wine', {
        context: 'spec',
        variants: { red: vi.fn(), white: vi.fn() },
        defaultVariant: 'white'
      });
    }

    beforeEach(() => {
      // Assignment bucket 25 will select: red (wine), puppet (jabba), false (blue_button)
      mockGetAssignmentBucket.mockReturnValue(25);
    });

    it('throws an error if the defaultVariant is not represented in the variants object', () => {
      const testTrack = createTestTrack();
      expect(() => {
        testTrack.vary('wine', {
          context: 'spec',
          variants: {
            white: () => {},
            red: () => {}
          },
          defaultVariant: 'rose'
        });
      }).toThrow('defaultVariant: rose must be represented in variants object');
    });

    describe('New Assignment', () => {
      it('generates a new assignment via calculateVariant', () => {
        const testTrack = createTestTrack();
        const red = vi.fn();
        const white = vi.fn();

        const result = testTrack.vary('wine', {
          context: 'spec',
          variants: { red, white },
          defaultVariant: 'white'
        });

        expect(result).toBe('red');
        expect(red).toHaveBeenCalledTimes(1);
        expect(white).not.toHaveBeenCalled();
        expect(mockGetAssignmentBucket).toHaveBeenCalledWith({
          visitorId: 'EXISTING_VISITOR_ID',
          splitName: 'wine'
        });
      });

      it('adds new assignments to the assignment registry', () => {
        const testTrack = createTestTrack();
        varyWineSplit(testTrack);

        expect(testTrack.getAssignmentRegistry()).toEqual({
          jabba: new Assignment({
            splitName: 'jabba',
            variant: 'puppet',
            isUnsynced: false
          }),
          wine: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: false
          })
        });
      });

      it('sends an AssignmentNotification', () => {
        const testTrack = createTestTrack();
        varyWineSplit(testTrack);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics: testTrack.analytics,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: false
          }),
          logError: expect.any(Function)
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      });

      it('only sends one AssignmentNotification with the default if it is defaulted', () => {
        const testTrack = createTestTrack();
        const rose = vi.fn();
        const white = vi.fn();

        // calculateVariant returns 'red', but it's not in variants, so should default to 'white'
        const result = testTrack.vary('wine', {
          context: 'spec',
          variants: { rose, white },
          defaultVariant: 'white'
        });

        expect(result).toBe('white');
        expect(white).toHaveBeenCalledTimes(1);
        expect(rose).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics: testTrack.analytics,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'white',
            context: 'spec',
            isUnsynced: false
          }),
          logError: expect.any(Function)
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      });

      it('logs an error if the AssignmentNotification throws an error', () => {
        const testTrack = createTestTrack();
        const errorLogger = vi.fn();

        testTrack.setErrorLogger(errorLogger);
        mockSendAssignmentNotification.mockImplementationOnce(() => {
          throw new Error('something bad happened');
        });

        varyWineSplit(testTrack);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics: testTrack.analytics,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          }),
          logError: expect.any(Function)
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
        expect(errorLogger).toHaveBeenCalledWith('test_track notify error: Error: something bad happened');
      });
    });

    describe('Existing Assignment', () => {
      it('returns an existing assignment wihout generating', () => {
        const testTrack = createTestTrack();
        const puppet = vi.fn();
        const cgi = vi.fn();

        const result = testTrack.vary('jabba', {
          context: 'spec',
          variants: { puppet, cgi },
          defaultVariant: 'cgi'
        });

        expect(result).toBe('puppet');
        expect(puppet).toHaveBeenCalledTimes(1);
        expect(cgi).not.toHaveBeenCalled();
      });

      it('does not send an AssignmentNotification', () => {
        const testTrack = createTestTrack();
        varyJabbaSplit(testTrack);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });

      it('sends an AssignmentNotification with the default if it is defaulted', () => {
        const testTrack = createTestTrack();
        const furryMan = vi.fn();
        const cgi = vi.fn();

        const result = testTrack.vary('jabba', {
          context: 'defaulted',
          variants: { furryMan, cgi },
          defaultVariant: 'cgi'
        });

        expect(result).toBe('cgi');
        expect(cgi).toHaveBeenCalledTimes(1);
        expect(furryMan).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitorId: 'EXISTING_VISITOR_ID',
          analytics: testTrack.analytics,
          assignment: new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            context: 'defaulted',
            isUnsynced: false // Marked as unsynced after the assignment notification
          }),
          logError: expect.any(Function)
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalled();
      });
    });

    describe('Offline TestTrack', () => {
      it('generates a new assignment via calculateVariant', () => {
        const testTrack = createOfflineTestTrack();
        varyJabbaSplit(testTrack);

        expect(mockGetAssignmentBucket).toHaveBeenCalledWith({
          visitorId: 'offline_visitor_id',
          splitName: 'jabba'
        });
      });

      it('does not send an AssignmentNotification', () => {
        const testTrack = createOfflineTestTrack();
        varyWineSplit(testTrack);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });
    });

    describe('Receives a null variant from calculateVariant', () => {
      it('adds the assignment to the assignment registry', () => {
        // Empty split registry returns null from calculateVariant
        const testTrack = createOfflineTestTrack();
        varyWineSplit(testTrack);

        expect(Object.keys(testTrack.getAssignmentRegistry())).toEqual(expect.arrayContaining(['wine']));
      });

      it('does not send an AssignmentNotification', () => {
        // Empty split registry returns null from calculateVariant
        const testTrack = createOfflineTestTrack();
        varyWineSplit(testTrack);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });
    });

    describe('Boolean split', () => {
      it('chooses the correct handler when given a true boolean', () => {
        mockGetAssignmentBucket.mockReturnValue(75); // Selects 'true'
        const testTrack = createTestTrack();
        expect(testTrack.vary('blue_button', { context: 'spec', defaultVariant: true })).toEqual('true');

        const trueHandler = vi.fn();
        const falseHandler = vi.fn();
        const result = testTrack.vary('blue_button', {
          context: 'spec',
          variants: { true: trueHandler, false: falseHandler },
          defaultVariant: false
        });

        expect(result).toBe('true');
        expect(trueHandler).toHaveBeenCalledTimes(1);
        expect(falseHandler).not.toHaveBeenCalled();
      });

      it('picks the correct handler when given a false boolean', () => {
        mockGetAssignmentBucket.mockReturnValue(25); // Selects 'false'
        const testTrack = createTestTrack();
        const trueHandler = vi.fn();
        const falseHandler = vi.fn();

        const result = testTrack.vary('blue_button', {
          context: 'spec',
          variants: {
            true: trueHandler,
            false: falseHandler
          },
          defaultVariant: false
        });

        expect(result).toBe('false');
        expect(falseHandler).toHaveBeenCalledTimes(1);
        expect(trueHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('.ab()', () => {
    it('leverages vary to configure the split', () => {
      const testTrack = createTestTrack();
      expect(testTrack.ab('jabba', { context: 'spec', trueVariant: 'puppet' })).toBe(true);

      const callback = vi.fn();
      const result = testTrack.ab('jabba', { context: 'spec', trueVariant: 'puppet', callback: callback });
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(true);
    });

    describe('with an explicit trueVariant', () => {
      it('returns true when assigned to the trueVariant', () => {
        const testTrack = createTestTrack([
          new Assignment({
            splitName: 'jabba',
            variant: 'puppet',
            isUnsynced: false
          })
        ]);

        const callback = vi.fn();
        const result = testTrack.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback
        });

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalledWith(true);
      });

      it('returns false when not assigned to the trueVariant', () => {
        const testTrack = createTestTrack([
          new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            isUnsynced: false
          })
        ]);

        const callback = vi.fn();
        const result = testTrack.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback
        });

        expect(result).toBe(false);
        expect(callback).toHaveBeenCalledWith(false);
      });
    });

    describe('with an implicit trueVariant', () => {
      it('returns true when variant is true', () => {
        const testTrack = createTestTrack([
          new Assignment({
            splitName: 'blue_button',
            variant: 'true',
            isUnsynced: false
          })
        ]);

        const callback = vi.fn();
        const result = testTrack.ab('blue_button', { context: 'spec', callback });

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalledWith(true);
      });

      it('returns false when variant is false', () => {
        const testTrack = createTestTrack([
          new Assignment({
            splitName: 'blue_button',
            variant: 'false',
            isUnsynced: false
          })
        ]);

        const callback = vi.fn();
        const result = testTrack.ab('blue_button', { context: 'spec', callback });

        expect(result).toBe(false);
        expect(callback).toHaveBeenCalledWith(false);
      });

      it('returns false when split variants are not true and false', () => {
        const testTrack = createTestTrack();
        const callback = vi.fn();

        const result = testTrack.ab('jabba', { context: 'spec', callback });

        expect(result).toBe(false);
        expect(callback).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('.linkIdentifier()', () => {
    beforeEach(() => {
      server.use(
        http.post('http://testtrack.dev/api/v1/identifier', () => {
          return HttpResponse.json({
            visitor: {
              id: 'actual_visitor_id',
              assignments: [
                {
                  split_name: 'jabba',
                  variant: 'cgi',
                  context: 'mos_eisley',
                  unsynced: false
                },
                {
                  split_name: 'blue_button',
                  variant: 'true',
                  context: 'homepage',
                  unsynced: true
                }
              ]
            }
          });
        })
      );
    });

    it('hits the test track server with the correct parameters', async () => {
      const testTrack = createTestTrack();
      await testTrack.linkIdentifier('myappdb_user_id', 444);

      expect(requests.length).toBe(1);
      expect(requests[0]!.url).toEqual('http://testtrack.dev/api/v1/identifier');
      expect(await requests[0]!.text()).toEqual(
        'visitor_id=EXISTING_VISITOR_ID&identifier_type=myappdb_user_id&value=444'
      );
    });

    it('overrides assignments that exist in the other visitor', async () => {
      const jabbaCGIAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        context: 'mos_eisley',
        isUnsynced: false
      });

      const jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true });
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

      const testTrack = createTestTrack([jabbaPuppetAssignment, wineAssignment]);

      await testTrack.linkIdentifier('myappdb_user_id', 444);
      expect(testTrack.getAssignmentRegistry()).toEqual({
        jabba: jabbaCGIAssignment,
        wine: wineAssignment,
        blue_button: new Assignment({
          splitName: 'blue_button',
          variant: 'true',
          context: 'homepage',
          isUnsynced: false // Marked as unsynced after the assignment notification
        })
      });
    });

    it('changes visitor id', async () => {
      const testTrack = createTestTrack();
      await testTrack.linkIdentifier('myappdb_user_id', 444);
      expect(testTrack.visitorId).toBe('actual_visitor_id');
      expect(testTrack.getId()).toBe('actual_visitor_id');
    });

    it('notifies any unsynced splits', async () => {
      const testTrack = createTestTrack();
      await testTrack.linkIdentifier('myappdb_user_id', 444);
      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        visitorId: 'actual_visitor_id',
        analytics: mixpanelAnalytics,
        assignment: new Assignment({
          splitName: 'blue_button',
          variant: 'true',
          context: 'homepage',
          isUnsynced: false // Marked as unsynced after the assignment notification
        }),
        logError: expect.any(Function)
      });
    });
  });

  describe('.logError()', () => {
    it('calls the error logger with the error message', () => {
      const testTrack = createTestTrack();
      const errorLogger = vi.fn();
      testTrack.setErrorLogger(errorLogger);
      testTrack.logError('something bad happened');

      expect(errorLogger).toHaveBeenCalledWith('something bad happened');
    });

    it('calls the error logger with a null context', () => {
      const testTrack = createTestTrack();
      const errorLogger = vi.fn();
      testTrack.setErrorLogger(errorLogger);
      testTrack.logError('something bad happened');

      expect(errorLogger.mock.instances[0]).toBeNull();
    });

    it('does a console.error if the error logger was never set', () => {
      const testTrack = createTestTrack();
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValueOnce();
      testTrack.logError('something bad happened');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('something bad happened');
    });
  });

  describe('.analytics', () => {
    it('defaults to mixpanel analytics', () => {
      const testTrack = createTestTrack();

      expect(testTrack.analytics).toBe(mixpanelAnalytics);
    });
  });

  describe('.setAnalytics()', () => {
    it('sets the analytics object on the visitor', () => {
      const testTrack = createTestTrack();
      const analytics: AnalyticsProvider = {
        trackAssignment: vi.fn(),
        alias: vi.fn(),
        identify: vi.fn()
      };

      testTrack.setAnalytics(analytics);

      expect(testTrack.analytics).toBe(analytics);
    });
  });

  describe('.notifyUnsyncedAssignments', () => {
    it('notifies any unsynced assignments', () => {
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false });
      const blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: 'true', isUnsynced: true });
      const testTrack = new TestTrack({
        client,
        storage,
        splitRegistry: emptySplitRegistry,
        visitor: { id: 'unsynced_visitor_id', assignments: [wineAssignment, blueButtonAssignment] }
      });

      testTrack.notifyUnsyncedAssignments();

      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);

      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        visitorId: 'unsynced_visitor_id',
        analytics: mixpanelAnalytics,
        assignment: blueButtonAssignment,
        logError: expect.any(Function)
      });
    });
  });
});
