import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Identifier from './identifier';
import TestTrackConfig from './testTrackConfig';
import VariantCalculator from './variantCalculator';
import Visitor from './visitor';
import client from './api';
import { v4 as uuid } from 'uuid';
import { mockSplitRegistry } from './test-utils';
import MockAdapter from 'axios-mock-adapter';

jest.mock('uuid');

jest.mock('./testTrackConfig', () => {
  return {
    getUrl: () => 'http://testtrack.dev',
    getAssignments: jest.fn()
  };
});

const mockGetVariant = jest.fn();
jest.mock('./variantCalculator', () => {
  return jest.fn(() => {
    return { getVariant: mockGetVariant };
  });
});

const mockSend = jest.fn();
jest.mock('./assignmentNotification', () => {
  return jest.fn(() => {
    return { send: mockSend };
  });
});

const mockSave = jest.fn();
jest.mock('./identifier', () => {
  return jest.fn(() => {
    return { save: mockSave };
  });
});

const mockClient = new MockAdapter(client);

describe('Visitor', () => {
  let visitor: Visitor;

  beforeEach(() => {
    visitor = new Visitor({
      id: 'EXISTING_VISITOR_ID',
      assignments: [
        new Assignment({
          splitName: 'jabba',
          variant: 'puppet',
          isUnsynced: false
        })
      ]
    });

    jest.mocked(TestTrackConfig.getAssignments).mockReset();
    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      }
    });
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe('instantiation', () => {
    it('requires an id', () => {
      expect(function() {
        // @ts-expect-error id is required
        new Visitor({
          assignments: []
        });
      }).toThrow('must provide id');
    });

    it('requires assignments', () => {
      expect(function() {
        // @ts-expect-error assignments are required
        new Visitor({
          id: 'visitor_id'
        });
      }).toThrow('must provide assignments');
    });
  });

  describe('.loadVisitor()', () => {
    beforeEach(() => {
      mockClient.onGet('/v1/visitors/server_visitor_id').reply(200, {
        id: 'server_visitor_id',
        assignments: [
          {
            split_name: 'jabba',
            variant: 'puppet',
            unsynced: false
          }
        ]
      });
    });

    it('does not hit the server when not passed a visitorId', () => {
      jest.mocked(uuid).mockReturnValue('generated_uuid');

      return Visitor.loadVisitor(undefined).then(function(visitor) {
        expect(mockClient.history.get.length).toBe(0);

        expect(visitor.getId()).toEqual('generated_uuid');
        expect(visitor.getAssignmentRegistry()).toEqual({});
      });
    });

    it('does not hit the server when passed a visitorId and there are baked assignments', () => {
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

      jest.mocked(TestTrackConfig.getAssignments).mockReturnValue([jabbaAssignment, wineAssignment]);

      return Visitor.loadVisitor('baked_visitor_id').then(function(visitor) {
        expect(mockClient.history.get.length).toBe(0);

        expect(visitor.getId()).toEqual('baked_visitor_id');
        expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment, wine: wineAssignment });
        expect(visitor._getUnsyncedAssignments()).toEqual([]);

        expect(visitor.getId()).toEqual('baked_visitor_id');
        expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment, wine: wineAssignment });
        expect(visitor._getUnsyncedAssignments()).toEqual([]);
      });
    });

    it('loads a visitor from the server for an existing visitor if there are no baked assignments', () => {
      mockClient.onGet('/v1/visitors/puppeteer_visitor_id').reply(200, {
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

      return Visitor.loadVisitor('puppeteer_visitor_id').then(function(visitor) {
        expect(mockClient.history.get[0].url).toEqual(expect.stringContaining('/v1/visitors/puppeteer_visitor_id'));

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
    });

    it('builds a visitor in offline mode if the request fails', () => {
      mockClient.onGet('/v1/visitors/failed_visitor_id').timeout();

      return Visitor.loadVisitor('failed_visitor_id').then(function(visitor) {
        expect(mockClient.history.get[0].url).toEqual(expect.stringContaining('/v1/visitors/failed_visitor_id'));

        expect(visitor.getId()).toEqual('failed_visitor_id');
        expect(visitor.getAssignmentRegistry()).toEqual({});
        // @ts-expect-error Private property
        expect(visitor._ttOffline).toEqual(true);
      });
    });
  });

  describe('#vary()', () => {
    let vary_jabba_split: (visitor: Visitor) => void;
    let vary_wine_split: (visitor: Visitor) => void;

    beforeEach(() => {
      mockGetVariant.mockReturnValue('red');

      vary_jabba_split = function(visitor) {
        visitor.vary('jabba', {
          context: 'spec',
          variants: {
            puppet: function() {},
            cgi: function() {}
          },
          defaultVariant: 'cgi'
        });
      };

      vary_wine_split = function(visitor) {
        visitor.vary('wine', {
          context: 'spec',
          variants: {
            red: function() {},
            white: function() {}
          },
          defaultVariant: 'white'
        });
      };
    });

    it('throws an error if a variants object is not provided', () => {
      expect(() => {
        visitor.vary('wine', {
          context: 'spec',
          defaultVariant: 'white'
        });
      }).toThrow('must provide variants object to `vary` for wine');
    });

    it('throws an error if a context is not provided', () => {
      expect(() => {
        visitor.vary('wine', {
          defaultVariant: 'white',
          variants: {
            white: function() {},
            red: function() {}
          }
        });
      }).toThrow('must provide context to `vary` for wine');
    });

    it('throws an error if a defaultVariant is not provided', () => {
      expect(() => {
        visitor.vary('wine', {
          context: 'spec',
          variants: {
            white: function() {},
            red: function() {}
          }
        });
      }).toThrow('must provide defaultVariant to `vary` for wine');
    });

    it('throws an error if the defaultVariant is not represented in the variants object', () => {
      expect(() => {
        visitor.vary('wine', {
          context: 'spec',
          variants: {
            white: function() {},
            red: function() {}
          },
          defaultVariant: 'rose'
        });
      }).toThrow('defaultVariant: rose must be represented in variants object');
    });

    describe('New Assignment', () => {
      it('generates a new assignment via VariantCalculator', () => {
        vary_wine_split(visitor);

        expect(VariantCalculator).toHaveBeenCalledWith({
          visitor: visitor,
          splitName: 'wine'
        });
        expect(mockGetVariant).toHaveBeenCalled();
      });

      it('adds new assignments to the assignment registry', () => {
        vary_wine_split(visitor);

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
        vary_wine_split(visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: false
          })
        });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('only sends one AssignmentNotification with the default if it is defaulted', () => {
        mockGetVariant.mockReturnValue('rose');

        vary_wine_split(visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'white',
            context: 'spec',
            isUnsynced: false
          })
        });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('logs an error if the AssignmentNotification throws an error', () => {
        visitor.logError = jest.fn();

        mockSend.mockImplementation(() => {
          throw new Error('something bad happened');
        });

        vary_wine_split(visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          })
        });
        expect(mockSend).toHaveBeenCalledTimes(1);

        expect(visitor.logError).toHaveBeenCalledWith('test_track notify error: Error: something bad happened');
      });
    });

    describe('Existing Assignment', () => {
      it('returns an existing assignment wihout generating', () => {
        vary_jabba_split(visitor);

        expect(VariantCalculator).not.toHaveBeenCalled();
      });

      it('does not send an AssignmentNotification', () => {
        vary_jabba_split(visitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('sends an AssignmentNotification with the default if it is defaulted', () => {
        visitor.vary('jabba', {
          context: 'defaulted',
          variants: {
            furry_man: function() {},
            cgi: function() {}
          },
          defaultVariant: 'cgi'
        });

        expect(AssignmentNotification).toHaveBeenCalledTimes(1);
        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: visitor,
          assignment: new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            context: 'defaulted',
            isUnsynced: true
          })
        });
        expect(mockSend).toHaveBeenCalled();
      });
    });

    describe('Offline Visitor', () => {
      let offlineVisitor: Visitor;

      beforeEach(() => {
        offlineVisitor = new Visitor({
          id: 'offline_visitor_id',
          assignments: [],
          ttOffline: true
        });
      });

      it('generates a new assignment via VariantCalculator', () => {
        vary_jabba_split(offlineVisitor);

        expect(VariantCalculator).toHaveBeenCalledTimes(1);
        expect(VariantCalculator).toHaveBeenCalledWith({
          visitor: offlineVisitor,
          splitName: 'jabba'
        });
        expect(mockGetVariant).toHaveBeenCalledTimes(1);
      });

      it('does not send an AssignmentNotification', () => {
        vary_wine_split(offlineVisitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe('Receives a null variant from VariantCalculator', () => {
      beforeEach(() => {
        mockGetVariant.mockReturnValue(null);
      });

      it('adds the assignment to the assignment registry', () => {
        vary_wine_split(visitor);

        expect(Object.keys(visitor.getAssignmentRegistry())).toEqual(expect.arrayContaining(['jabba', 'wine']));
      });

      it('does not send an AssignmentNotification', () => {
        vary_wine_split(visitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe('Boolean split', () => {
      let trueHandler: jest.Mock;
      let falseHandler: jest.Mock;
      let vary_blue_button_split: () => void;

      beforeEach(() => {
        trueHandler = jest.fn();
        falseHandler = jest.fn();

        vary_blue_button_split = function() {
          visitor.vary('blue_button', {
            context: 'spec',
            variants: {
              true: trueHandler,
              false: falseHandler
            },
            defaultVariant: false
          });
        };
      });

      it('chooses the correct handler when given a true boolean', () => {
        mockGetVariant.mockReturnValue('true');

        vary_blue_button_split();

        expect(trueHandler).toHaveBeenCalledTimes(1);
        expect(falseHandler).not.toHaveBeenCalled();
      });

      it('picks the correct handler when given a false boolean', () => {
        mockGetVariant.mockReturnValue('false');

        vary_blue_button_split();

        expect(falseHandler).toHaveBeenCalledTimes(1);
        expect(trueHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('#ab()', () => {
    it('leverages vary to configure the split', () => {
      const handler = jest.fn();

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
          callback: function(isPuppet) {
            expect(isPuppet).toBe(true);
          }
        });
      });

      it('returns false when not assigned to the trueVariant', () => {
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
          callback: function(isPuppet) {
            expect(isPuppet).toBe(false);
          }
        });
      });
    });

    describe('with an implicit trueVariant', () => {
      it('returns true when variant is true', () => {
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
          callback: function(isBlue) {
            expect(isBlue).toBe(true);
          }
        });
      });

      it('returns false when variant is false', () => {
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
          callback: function(isBlue) {
            expect(isBlue).toBe(false);
          }
        });
      });

      it('returns false when split variants are not true and false', () => {
        visitor.ab('jabba', {
          context: 'spec',
          callback: function(isTrue) {
            expect(isTrue).toBe(false);
          }
        });
      });
    });
  });

  describe('#linkIdentifier()', () => {
    let jabbaCGIAssignment: Assignment;
    let blueButtonAssignment: Assignment;
    let actualVisitor: Visitor;

    beforeEach(() => {
      jabbaCGIAssignment = new Assignment({ splitName: 'jabba', variant: 'cgi', isUnsynced: false });
      blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

      mockSave.mockImplementation(() => {
        actualVisitor = new Visitor({
          id: 'actual_visitor_id',
          assignments: [jabbaCGIAssignment, blueButtonAssignment]
        });

        return Promise.resolve(actualVisitor);
      });
    });

    it('saves an identifier', () => {
      visitor.linkIdentifier('myappdb_user_id', 444);

      expect(Identifier).toHaveBeenCalledTimes(1);
      expect(Identifier).toHaveBeenCalledWith({
        visitorId: 'EXISTING_VISITOR_ID',
        identifierType: 'myappdb_user_id',
        value: 444
      });
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('overrides assignments that exist in the other visitor', () => {
      const jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true });
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

      // @ts-expect-error Private property
      visitor._assignments = [jabbaPuppetAssignment, wineAssignment];

      return visitor.linkIdentifier('myappdb_user_id', 444).then(() => {
        expect(visitor.getAssignmentRegistry()).toEqual({
          jabba: jabbaCGIAssignment,
          wine: wineAssignment,
          blue_button: blueButtonAssignment
        });
      });
    });

    it('changes visitor id', () => {
      return visitor.linkIdentifier('myappdb_user_id', 444).then(() => {
        expect(visitor.getId()).toBe('actual_visitor_id');
      });
    });

    it('notifies any unsynced splits', () => {
      return visitor.linkIdentifier('myappdb_user_id', 444).then(() => {
        expect(AssignmentNotification).toHaveBeenCalledTimes(1);
        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: visitor,
          assignment: blueButtonAssignment
        });
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('#setErrorLogger()', () => {
    it('throws an error if not provided with a function', () => {
      expect(() => {
        visitor.setErrorLogger('teapot');
      }).toThrow('must provide function for errorLogger');
    });

    it('sets the error logger on the visitor', () => {
      const errorLogger = function() {};

      visitor.setErrorLogger(errorLogger);

      // @ts-expect-error Private property
      expect(visitor._errorLogger).toBe(errorLogger);
    });
  });

  describe('#logError()', () => {
    let errorLogger: jest.Mock;

    beforeEach(() => {
      errorLogger = jest.fn();
    });

    it('calls the error logger with the error message', () => {
      visitor.setErrorLogger(errorLogger);
      visitor.logError('something bad happened');

      expect(errorLogger).toHaveBeenCalledTimes(1);
      expect(errorLogger).toHaveBeenCalledWith('something bad happened');
    });

    it('calls the error logger with a null context', () => {
      visitor.setErrorLogger(errorLogger);
      visitor.logError('something bad happened');

      expect(errorLogger.mock.instances[0]).toBeNull();
    });

    it('does a console.error if the error logger was never set', () => {
      const consoleSpy = jest.spyOn(window.console, 'error');
      visitor.logError('something bad happened');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('something bad happened');
      expect(errorLogger).not.toHaveBeenCalled();
    });
  });

  describe('#setAnalytics()', () => {
    it('throws an error if not provided with an object', () => {
      expect(() => {
        visitor.setAnalytics('teapot');
      }).toThrow('must provide object for setAnalytics');
    });

    it('sets the analytics object on the visitor', () => {
      const analytics = {};

      visitor.setAnalytics(analytics);

      expect(visitor.analytics).toBe(analytics);
    });
  });

  describe('#notifyUnsyncedAssignments', () => {
    it('notifies any unsynced assignments', () => {
      const wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false });
      const blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: 'true', isUnsynced: true });

      const visitor = new Visitor({
        id: 'unsynced_visitor_id',
        assignments: [wineAssignment, blueButtonAssignment]
      });

      visitor.notifyUnsyncedAssignments();

      expect(AssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledTimes(1);

      expect(AssignmentNotification).toHaveBeenCalledWith({
        visitor: visitor,
        assignment: blueButtonAssignment
      });
    });
  });
});
