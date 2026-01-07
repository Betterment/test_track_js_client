import Assignment from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
import { calculateVariant } from './calculateVariant';
import Visitor from './visitor';
import { v4 as uuid } from 'uuid';
import { http, HttpResponse } from 'msw';
import { server, requests } from './setupTests';
import type { AnalyticsProvider } from './analyticsProvider';
import { createClient } from './client';
import { createSplitRegistry } from './splitRegistry';

vi.mock('uuid');
vi.mock('./calculateVariant');
vi.mock('./assignmentNotification');

const mockCalculateVariant = vi.mocked(calculateVariant);
const mockSendAssignmentNotification = vi.mocked(sendAssignmentNotification);

const client = createClient({ url: 'http://testtrack.dev' });
const emptySplitRegistry = createSplitRegistry(null);

const splitRegistry = createSplitRegistry([
  {
    name: 'element',
    isFeatureGate: false,
    weighting: { earth: 25, wind: 25, fire: 25, water: 25 }
  }
]);

function createVisitor() {
  return new Visitor({
    client,
    splitRegistry,
    id: 'EXISTING_VISITOR_ID',
    assignments: [
      new Assignment({
        splitName: 'jabba',
        variant: 'puppet',
        isUnsynced: false
      })
    ]
  });
}

describe('Visitor', () => {
  describe('.loadVisitor()', () => {
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

      const visitor = await Visitor.loadVisitor({
        client,
        splitRegistry,
        id: undefined,
        assignments: null
      });
      expect(requests.length).toBe(0);
      expect(visitor.getId()).toEqual('generated_uuid');
      expect(visitor.getAssignmentRegistry()).toEqual({});
    });

    it('does not hit the server when passed a visitorId and there are baked assignments', async () => {
      const jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'puppet',
        isUnsynced: false
      });

      const wineAssignment = new Assignment({
        splitName: 'wine',
        variant: 'rose',
        isUnsynced: false
      });

      const visitor = await Visitor.loadVisitor({
        client,
        splitRegistry,
        id: 'baked_visitor_id',
        assignments: [jabbaAssignment, wineAssignment]
      });
      expect(requests.length).toBe(0);
      expect(visitor.getId()).toEqual('baked_visitor_id');
      expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment, wine: wineAssignment });
      expect(visitor._getUnsyncedAssignments()).toEqual([]);
      expect(visitor.getId()).toEqual('baked_visitor_id');
      expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment, wine: wineAssignment });
      expect(visitor._getUnsyncedAssignments()).toEqual([]);
    });

    it('loads a visitor from the server for an existing visitor if there are no baked assignments', async () => {
      const visitor = await Visitor.loadVisitor({
        client,
        splitRegistry,
        id: 'puppeteer_visitor_id',
        assignments: null
      });
      expect(requests.length).toBe(1);
      expect(requests[0].url).toEqual('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id');
      const jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'puppet',
        context: 'mos_eisley',
        isUnsynced: false
      });
      expect(visitor.getId()).toBe('puppeteer_visitor_id');
      expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment });
      expect(visitor._getUnsyncedAssignments()).toEqual([]);
    });

    it('builds a visitor in offline mode if the request fails', async () => {
      server.use(
        http.get('http://testtrack.dev/api/v1/visitors/failed_visitor_id', () => {
          return HttpResponse.error();
        })
      );

      const visitor = await Visitor.loadVisitor({
        client,
        splitRegistry,
        id: 'failed_visitor_id',
        assignments: null
      });
      expect(requests.length).toBe(1);
      expect(requests[0].url).toEqual('http://testtrack.dev/api/v1/visitors/failed_visitor_id');
      expect(visitor.getId()).toEqual('failed_visitor_id');
      expect(visitor.getAssignmentRegistry()).toEqual({});
      // @ts-expect-error Private property
      expect(visitor._ttOffline).toEqual(true);
    });
  });

  describe('#vary()', () => {
    function varyJabbaSplit(visitor: Visitor) {
      visitor.vary('jabba', {
        context: 'spec',
        variants: { puppet: vi.fn(), cgi: vi.fn() },
        defaultVariant: 'cgi'
      });
    }

    function varyWineSplit(visitor: Visitor) {
      visitor.vary('wine', {
        context: 'spec',
        variants: { red: vi.fn(), white: vi.fn() },
        defaultVariant: 'white'
      });
    }

    beforeEach(() => {
      mockCalculateVariant.mockReturnValue('red');
    });

    it('throws an error if the defaultVariant is not represented in the variants object', () => {
      const visitor = createVisitor();
      expect(() => {
        visitor.vary('wine', {
          context: 'spec',
          variants: {
            white: function () {},
            red: function () {}
          },
          defaultVariant: 'rose'
        });
      }).toThrow('defaultVariant: rose must be represented in variants object');
    });

    describe('New Assignment', () => {
      it('generates a new assignment via calculateVariant', () => {
        const visitor = createVisitor();
        varyWineSplit(visitor);

        expect(mockCalculateVariant).toHaveBeenCalledWith({
          visitor,
          splitRegistry,
          splitName: 'wine'
        });
      });

      it('adds new assignments to the assignment registry', () => {
        const visitor = createVisitor();
        varyWineSplit(visitor);

        expect(visitor.getAssignmentRegistry()).toEqual({
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
        const visitor = createVisitor();
        varyWineSplit(visitor);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: false
          })
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      });

      it('only sends one AssignmentNotification with the default if it is defaulted', () => {
        mockCalculateVariant.mockReturnValue('rose');
        const visitor = createVisitor();

        varyWineSplit(visitor);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'white',
            context: 'spec',
            isUnsynced: false
          })
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      });

      it('logs an error if the AssignmentNotification throws an error', () => {
        const visitor = createVisitor();
        visitor.logError = vi.fn();

        mockSendAssignmentNotification.mockImplementation(() => {
          throw new Error('something bad happened');
        });

        varyWineSplit(visitor);

        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          })
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);

        expect(visitor.logError).toHaveBeenCalledWith('test_track notify error: Error: something bad happened');
      });
    });

    describe('Existing Assignment', () => {
      it('returns an existing assignment wihout generating', () => {
        const visitor = createVisitor();
        varyJabbaSplit(visitor);

        expect(mockCalculateVariant).not.toHaveBeenCalled();
      });

      it('does not send an AssignmentNotification', () => {
        const visitor = createVisitor();
        varyJabbaSplit(visitor);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });

      it('sends an AssignmentNotification with the default if it is defaulted', () => {
        const visitor = createVisitor();
        visitor.vary('jabba', {
          context: 'defaulted',
          variants: {
            furry_man: function () {},
            cgi: function () {}
          },
          defaultVariant: 'cgi'
        });

        expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
        expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
          client,
          visitor,
          assignment: new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            context: 'defaulted',
            isUnsynced: true
          })
        });
        expect(mockSendAssignmentNotification).toHaveBeenCalled();
      });
    });

    describe('Offline Visitor', () => {
      function createOfflineVisitor() {
        return new Visitor({
          client,
          splitRegistry: emptySplitRegistry,
          id: 'offline_visitor_id',
          assignments: [],
          ttOffline: true
        });
      }

      it('generates a new assignment via calculateVariant', () => {
        const offlineVisitor = createOfflineVisitor();
        varyJabbaSplit(offlineVisitor);

        expect(mockCalculateVariant).toHaveBeenCalledTimes(1);
        expect(mockCalculateVariant).toHaveBeenCalledWith({
          visitor: offlineVisitor,
          splitRegistry: emptySplitRegistry,
          splitName: 'jabba'
        });
      });

      it('does not send an AssignmentNotification', () => {
        const offlineVisitor = createOfflineVisitor();
        varyWineSplit(offlineVisitor);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });
    });

    describe('Receives a null variant from calculateVariant', () => {
      beforeEach(() => {
        mockCalculateVariant.mockReturnValue(null);
      });

      it('adds the assignment to the assignment registry', () => {
        const visitor = createVisitor();
        varyWineSplit(visitor);

        expect(Object.keys(visitor.getAssignmentRegistry())).toEqual(expect.arrayContaining(['jabba', 'wine']));
      });

      it('does not send an AssignmentNotification', () => {
        const visitor = createVisitor();
        varyWineSplit(visitor);

        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
        expect(mockSendAssignmentNotification).not.toHaveBeenCalled();
      });
    });

    describe('Boolean split', () => {
      it('chooses the correct handler when given a true boolean', () => {
        mockCalculateVariant.mockReturnValue('true');
        const visitor = createVisitor();
        const trueHandler = vi.fn();
        const falseHandler = vi.fn();

        visitor.vary('blue_button', {
          context: 'spec',
          variants: {
            true: trueHandler,
            false: falseHandler
          },
          defaultVariant: false
        });

        expect(trueHandler).toHaveBeenCalledTimes(1);
        expect(falseHandler).not.toHaveBeenCalled();
      });

      it('picks the correct handler when given a false boolean', () => {
        mockCalculateVariant.mockReturnValue('false');
        const visitor = createVisitor();
        const trueHandler = vi.fn();
        const falseHandler = vi.fn();

        visitor.vary('blue_button', {
          context: 'spec',
          variants: {
            true: trueHandler,
            false: falseHandler
          },
          defaultVariant: false
        });

        expect(falseHandler).toHaveBeenCalledTimes(1);
        expect(trueHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('#ab()', () => {
    it('leverages vary to configure the split', () => {
      const visitor = createVisitor();
      const handler = vi.fn();

      visitor.ab('jabba', {
        context: 'spec',
        trueVariant: 'puppet',
        callback: handler
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(true);
    });

    describe('with an explicit trueVariant', () => {
      it('returns true when assigned to the trueVariant', () => {
        const visitor = createVisitor();
        // @ts-expect-error Private property
        visitor._assignments = [
          new Assignment({
            splitName: 'jabba',
            variant: 'puppet',
            isUnsynced: false
          })
        ];

        visitor.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback: function (isPuppet) {
            expect(isPuppet).toBe(true);
          }
        });
      });

      it('returns false when not assigned to the trueVariant', () => {
        const visitor = createVisitor();
        // @ts-expect-error Private property
        visitor._assignments = [
          new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            isUnsynced: false
          })
        ];

        visitor.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback: function (isPuppet) {
            expect(isPuppet).toBe(false);
          }
        });
      });
    });

    describe('with an implicit trueVariant', () => {
      it('returns true when variant is true', () => {
        const visitor = createVisitor();
        // @ts-expect-error Private property
        visitor._assignments = [
          new Assignment({
            splitName: 'blue_button',
            variant: 'true',
            isUnsynced: false
          })
        ];

        visitor.ab('blue_button', {
          context: 'spec',
          callback: function (isBlue) {
            expect(isBlue).toBe(true);
          }
        });
      });

      it('returns false when variant is false', () => {
        const visitor = createVisitor();
        // @ts-expect-error Private property
        visitor._assignments = [
          new Assignment({
            splitName: 'blue_button',
            variant: 'false',
            isUnsynced: false
          })
        ];

        visitor.ab('blue_button', {
          context: 'spec',
          callback: function (isBlue) {
            expect(isBlue).toBe(false);
          }
        });
      });

      it('returns false when split variants are not true and false', () => {
        const visitor = createVisitor();
        visitor.ab('jabba', {
          context: 'spec',
          callback: function (isTrue) {
            expect(isTrue).toBe(false);
          }
        });
      });
    });
  });

  describe('#linkIdentifier()', () => {
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
      const visitor = createVisitor();
      await visitor.linkIdentifier('myappdb_user_id', 444);

      expect(requests.length).toBe(1);
      expect(requests[0].url).toEqual('http://testtrack.dev/api/v1/identifier');
      expect(await requests[0].text()).toEqual(
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
      const blueButtonAssignment = new Assignment({
        splitName: 'blue_button',
        variant: 'true',
        context: 'homepage',
        isUnsynced: true
      });
      const visitor = createVisitor();
      const jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true });
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

      // @ts-expect-error Private property
      visitor._assignments = [jabbaPuppetAssignment, wineAssignment];

      await visitor.linkIdentifier('myappdb_user_id', 444);
      expect(visitor.getAssignmentRegistry()).toEqual({
        jabba: jabbaCGIAssignment,
        wine: wineAssignment,
        blue_button: blueButtonAssignment
      });
    });

    it('changes visitor id', async () => {
      const visitor = createVisitor();
      await visitor.linkIdentifier('myappdb_user_id', 444);
      expect(visitor.getId()).toBe('actual_visitor_id');
    });

    it('notifies any unsynced splits', async () => {
      const blueButtonAssignment = new Assignment({
        splitName: 'blue_button',
        variant: 'true',
        context: 'homepage',
        isUnsynced: true
      });
      const visitor = createVisitor();
      await visitor.linkIdentifier('myappdb_user_id', 444);
      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        visitor,
        assignment: blueButtonAssignment
      });
    });
  });

  describe('#setErrorLogger()', () => {
    it('sets the error logger on the visitor', () => {
      const visitor = createVisitor();
      const errorLogger = function () {};

      visitor.setErrorLogger(errorLogger);

      // @ts-expect-error Private property
      expect(visitor._errorLogger).toBe(errorLogger);
    });
  });

  describe('#logError()', () => {
    it('calls the error logger with the error message', () => {
      const visitor = createVisitor();
      const errorLogger = vi.fn();
      visitor.setErrorLogger(errorLogger);
      visitor.logError('something bad happened');

      expect(errorLogger).toHaveBeenCalledTimes(1);
      expect(errorLogger).toHaveBeenCalledWith('something bad happened');
    });

    it('calls the error logger with a null context', () => {
      const visitor = createVisitor();
      const errorLogger = vi.fn();
      visitor.setErrorLogger(errorLogger);
      visitor.logError('something bad happened');

      expect(errorLogger.mock.instances[0]).toBeNull();
    });

    it('does a console.error if the error logger was never set', () => {
      const visitor = createVisitor();
      const errorLogger = vi.fn();
      const consoleSpy = vi.spyOn(window.console, 'error');
      visitor.logError('something bad happened');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('something bad happened');
      expect(errorLogger).not.toHaveBeenCalled();
    });
  });

  describe('.analytics', () => {
    it('defaults to mixpanel analytics', () => {
      const visitor = createVisitor();

      expect(visitor.analytics).toBe(mixpanelAnalytics);
    });
  });

  describe('#setAnalytics()', () => {
    it('sets the analytics object on the visitor', () => {
      const visitor = createVisitor();
      const analytics: AnalyticsProvider = {
        trackAssignment: vi.fn(),
        alias: vi.fn(),
        identify: vi.fn()
      };

      visitor.setAnalytics(analytics);

      expect(visitor.analytics).toBe(analytics);
    });
  });

  describe('#notifyUnsyncedAssignments', () => {
    it('notifies any unsynced assignments', () => {
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false });
      const blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: 'true', isUnsynced: true });

      const visitor = new Visitor({
        client,
        splitRegistry: emptySplitRegistry,
        id: 'unsynced_visitor_id',
        assignments: [wineAssignment, blueButtonAssignment]
      });

      visitor.notifyUnsyncedAssignments();

      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockSendAssignmentNotification).toHaveBeenCalledTimes(1);

      expect(mockSendAssignmentNotification).toHaveBeenCalledWith({
        client,
        visitor: visitor,
        assignment: blueButtonAssignment
      });
    });
  });
});
