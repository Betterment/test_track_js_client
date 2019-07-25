import Assignment from './assignment';
import AssignmentNotification from './assignmentNotification';
import Identifier from './identifier';
import TestTrackConfig from './testTrackConfig';
import VariantCalculator from './variantCalculator';
import Visitor from './visitor';
import $ from 'jquery';
import uuid from 'uuid/v4';
import { mockSplitRegistry } from './test-utils';

jest.mock('uuid/v4');

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

describe('Visitor', () => {
  let testContext;
  beforeEach(() => {
    testContext = {};
    testContext.visitor = existingVisitor();
    TestTrackConfig.getAssignments.mockReset();
    TestTrackConfig.getSplitRegistry = mockSplitRegistry({
      element: {
        earth: 25,
        wind: 25,
        fire: 25,
        water: 25
      }
    });
  });

  function existingVisitor(visitorId) {
    return new Visitor({
      id: visitorId || 'EXISTING_VISITOR_ID',
      assignments: [
        new Assignment({
          splitName: 'jabba',
          variant: 'puppet',
          isUnsynced: false
        })
      ]
    });
  }

  describe('instantiation', () => {
    it('requires an id', () => {
      expect(function() {
        new Visitor({
          assignments: []
        });
      }).toThrow('must provide id');
    });

    it('requires assignments', () => {
      expect(function() {
        new Visitor({
          id: 'visitor_id'
        });
      }).toThrow('must provide assignments');
    });
  });

  describe('.loadVisitor()', () => {
    beforeEach(() => {
      $.ajax = jest.fn().mockImplementation(() =>
        $.Deferred()
          .resolve({
            id: 'server_visitor_id',
            assignments: [
              {
                split_name: 'jabba',
                variant: 'puppet',
                unsynced: false
              }
            ]
          })
          .promise()
      );
    });

    it('it does not hit the server when not passed a visitorId', done => {
      uuid.mockReturnValue('generated_uuid');

      Visitor.loadVisitor(undefined).then(
        function(visitor) {
          expect($.ajax).not.toHaveBeenCalled();

          expect(visitor.getId()).toEqual('generated_uuid');
          expect(visitor.getAssignmentRegistry()).toEqual({});

          done();
        }.bind(this)
      );
    });

    it('it does not hit the server when passed a visitorId and there are baked assignments', done => {
      var jabbaAssignment = new Assignment({
        splitName: 'jabba',
        variant: 'puppet',
        isUnsynced: false
      });

      var wineAssignment = new Assignment({
        splitName: 'wine',
        variant: 'rose',
        isUnsynced: false
      });

      TestTrackConfig.getAssignments.mockReturnValue([jabbaAssignment, wineAssignment]);

      Visitor.loadVisitor('baked_visitor_id').then(
        function(visitor) {
          expect($.ajax).not.toHaveBeenCalled();

          expect(visitor.getId()).toEqual('baked_visitor_id');
          expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment, wine: wineAssignment });
          expect(visitor._getUnsyncedAssignments()).toEqual([]);

          done();
        }.bind(this)
      );
    });

    it('it loads a visitor from the server for an existing visitor if there are no baked assignments', done => {
      $.ajax = jest.fn().mockImplementation(() =>
        $.Deferred()
          .resolve({
            id: 'puppeteer_visitor_id',
            assignments: [
              {
                split_name: 'jabba',
                variant: 'puppet',
                context: 'mos_eisley',
                unsynced: false
              }
            ]
          })
          .promise()
      );

      Visitor.loadVisitor('puppeteer_visitor_id').then(
        function(visitor) {
          expect($.ajax).toHaveBeenCalledWith('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id', {
            method: 'GET',
            timeout: 5000
          });

          var jabbaAssignment = new Assignment({
            splitName: 'jabba',
            variant: 'puppet',
            context: 'mos_eisley',
            isUnsynced: false
          });

          expect(visitor.getId()).toBe('puppeteer_visitor_id');
          expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment });
          expect(visitor._getUnsyncedAssignments()).toEqual([]);

          done();
        }.bind(this)
      );
    });

    it('it builds a visitor in offline mode if the request fails', done => {
      $.ajax = jest.fn().mockImplementation(() =>
        $.Deferred()
          .reject()
          .promise()
      );

      Visitor.loadVisitor('failed_visitor_id').then(
        function(visitor) {
          expect($.ajax).toHaveBeenCalledWith('http://testtrack.dev/api/v1/visitors/failed_visitor_id', {
            method: 'GET',
            timeout: 5000
          });

          expect(visitor.getId()).toEqual('failed_visitor_id');
          expect(visitor.getAssignmentRegistry()).toEqual({});
          expect(visitor._ttOffline).toEqual(true);

          done();
        }.bind(this)
      );
    });
  });

  describe('#vary()', () => {
    beforeEach(() => {
      mockGetVariant.mockReturnValue('red');

      testContext.vary_jabba_split = function(visitor) {
        visitor.vary('jabba', {
          context: 'spec',
          variants: {
            puppet: function() {},
            cgi: function() {}
          },
          defaultVariant: 'cgi'
        });
      }.bind(this);

      testContext.vary_wine_split = function(visitor) {
        visitor.vary('wine', {
          context: 'spec',
          variants: {
            red: function() {},
            white: function() {}
          },
          defaultVariant: 'white'
        });
      }.bind(this);
    });

    it('throws an error if a variants object is not provided', () => {
      expect(
        function() {
          testContext.visitor.vary('wine', {
            context: 'spec',
            defaultVariant: 'white'
          });
        }.bind(this)
      ).toThrow('must provide variants object to `vary` for wine');
    });

    it('throws an error if a context is not provided', () => {
      expect(
        function() {
          testContext.visitor.vary('wine', {
            defaultVariant: 'white',
            variants: {
              white: function() {},
              red: function() {}
            }
          });
        }.bind(this)
      ).toThrow('must provide context to `vary` for wine');
    });

    it('throws an error if a defaultVariant is not provided', () => {
      expect(
        function() {
          testContext.visitor.vary('wine', {
            context: 'spec',
            variants: {
              white: function() {},
              red: function() {}
            }
          });
        }.bind(this)
      ).toThrow('must provide defaultVariant to `vary` for wine');
    });

    it('throws an error if the defaultVariant is not represented in the variants object', () => {
      expect(
        function() {
          testContext.visitor.vary('wine', {
            context: 'spec',
            variants: {
              white: function() {},
              red: function() {}
            },
            defaultVariant: 'rose'
          });
        }.bind(this)
      ).toThrow('defaultVariant: rose must be represented in variants object');
    });

    describe('New Assignment', () => {
      it('generates a new assignment via VariantCalculator', () => {
        testContext.vary_wine_split(testContext.visitor);

        expect(VariantCalculator).toHaveBeenCalledWith({
          visitor: testContext.visitor,
          splitName: 'wine'
        });
        expect(mockGetVariant).toHaveBeenCalled();
      });

      it('adds new assignments to the assignment registry', () => {
        testContext.vary_wine_split(testContext.visitor);

        expect(testContext.visitor.getAssignmentRegistry()).toEqual({
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
        testContext.vary_wine_split(testContext.visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: testContext.visitor,
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

        testContext.vary_wine_split(testContext.visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: testContext.visitor,
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
        testContext.visitor.logError = jest.fn();

        mockSend.mockImplementation(() => {
          throw new Error('something bad happened');
        });

        testContext.vary_wine_split(testContext.visitor);

        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: testContext.visitor,
          assignment: new Assignment({
            splitName: 'wine',
            variant: 'red',
            context: 'spec',
            isUnsynced: true
          })
        });
        expect(mockSend).toHaveBeenCalledTimes(1);

        expect(testContext.visitor.logError).toHaveBeenCalledWith(
          'test_track notify error: Error: something bad happened'
        );
      });
    });

    describe('Existing Assignment', () => {
      it('returns an existing assignment wihout generating', () => {
        testContext.vary_jabba_split(testContext.visitor);

        expect(VariantCalculator).not.toHaveBeenCalled();
      });

      it('does not send an AssignmentNotification', () => {
        testContext.vary_jabba_split(testContext.visitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });

      it('sends an AssignmentNotification with the default if it is defaulted', () => {
        testContext.visitor.vary('jabba', {
          context: 'defaulted',
          variants: {
            furry_man: function() {},
            cgi: function() {}
          },
          defaultVariant: 'cgi'
        });

        expect(AssignmentNotification).toHaveBeenCalledTimes(1);
        expect(AssignmentNotification).toHaveBeenCalledWith({
          visitor: testContext.visitor,
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
      beforeEach(() => {
        testContext.offlineVisitor = new Visitor({
          id: 'offline_visitor_id',
          assignments: [],
          ttOffline: true
        });
      });

      it('generates a new assignment via VariantCalculator', () => {
        testContext.vary_jabba_split(testContext.offlineVisitor);

        expect(VariantCalculator).toHaveBeenCalledTimes(1);
        expect(VariantCalculator).toHaveBeenCalledWith({
          visitor: testContext.offlineVisitor,
          splitName: 'jabba'
        });
        expect(mockGetVariant).toHaveBeenCalledTimes(1);
      });

      it('does not send an AssignmentNotification', () => {
        testContext.vary_wine_split(testContext.offlineVisitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe('Receives a null variant from VariantCalculator', () => {
      beforeEach(() => {
        mockGetVariant.mockReturnValue(null);
      });

      it('adds the assignment to the assignment registry', () => {
        testContext.vary_wine_split(testContext.visitor);

        expect(Object.keys(testContext.visitor.getAssignmentRegistry())).toEqual(
          expect.arrayContaining(['jabba', 'wine'])
        );
      });

      it('does not send an AssignmentNotification', () => {
        testContext.vary_wine_split(testContext.visitor);

        expect(AssignmentNotification).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
      });
    });

    describe('Boolean split', () => {
      beforeEach(() => {
        testContext.trueHandler = jest.fn();
        testContext.falseHandler = jest.fn();

        testContext.vary_blue_button_split = function() {
          testContext.visitor.vary('blue_button', {
            context: 'spec',
            variants: {
              true: testContext.trueHandler,
              false: testContext.falseHandler
            },
            defaultVariant: false
          });
        }.bind(this);
      });

      it('chooses the correct handler when given a true boolean', () => {
        mockGetVariant.mockReturnValue('true');

        testContext.vary_blue_button_split();

        expect(testContext.trueHandler).toHaveBeenCalledTimes(1);
        expect(testContext.falseHandler).not.toHaveBeenCalled();
      });

      it('picks the correct handler when given a false boolean', () => {
        mockGetVariant.mockReturnValue('false');

        testContext.vary_blue_button_split();

        expect(testContext.falseHandler).toHaveBeenCalledTimes(1);
        expect(testContext.trueHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('#ab()', () => {
    it('leverages vary to configure the split', () => {
      var handler = jest.fn();

      testContext.visitor.ab('jabba', {
        context: 'spec',
        trueVariant: 'puppet',
        callback: handler
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(true);
    });

    describe('with an explicit trueVariant', () => {
      it('returns true when assigned to the trueVariant', done => {
        testContext.visitor._assignments = [
          new Assignment({
            splitName: 'jabba',
            variant: 'puppet',
            isUnsynced: false
          })
        ];

        testContext.visitor.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback: function(isPuppet) {
            expect(isPuppet).toBe(true);
            done();
          }
        });
      });

      it('returns false when not assigned to the trueVariant', done => {
        testContext.visitor._assignments = [
          new Assignment({
            splitName: 'jabba',
            variant: 'cgi',
            isUnsynced: false
          })
        ];

        testContext.visitor.ab('jabba', {
          context: 'spec',
          trueVariant: 'puppet',
          callback: function(isPuppet) {
            expect(isPuppet).toBe(false);
            done();
          }
        });
      });
    });

    describe('with an implicit trueVariant', () => {
      it('returns true when variant is true', done => {
        testContext.visitor._assignments = [
          new Assignment({
            splitName: 'blue_button',
            variant: 'true',
            isUnsynced: false
          })
        ];

        testContext.visitor.ab('blue_button', {
          context: 'spec',
          callback: function(isBlue) {
            expect(isBlue).toBe(true);
            done();
          }
        });
      });

      it('returns false when variant is false', done => {
        testContext.visitor._assignments = [
          new Assignment({
            splitName: 'blue_button',
            variant: 'false',
            isUnsynced: false
          })
        ];

        testContext.visitor.ab('blue_button', {
          context: 'spec',
          callback: function(isBlue) {
            expect(isBlue).toBe(false);
            done();
          }
        });
      });

      it('returns false when split variants are not true and false', done => {
        testContext.visitor.ab('jabba', {
          context: 'spec',
          callback: function(isTrue) {
            expect(isTrue).toBe(false);
            done();
          }
        });
      });
    });
  });

  describe('#linkIdentifier()', () => {
    beforeEach(() => {
      testContext.jabbaCGIAssignment = new Assignment({ splitName: 'jabba', variant: 'cgi', isUnsynced: false });
      testContext.blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

      mockSave.mockImplementation(() => {
        testContext.actualVisitor = new Visitor({
          id: 'actual_visitor_id',
          assignments: [testContext.jabbaCGIAssignment, testContext.blueButtonAssignment]
        });

        return $.Deferred()
          .resolve(testContext.actualVisitor)
          .promise();
      });
    });

    it('saves an identifier', () => {
      testContext.visitor.linkIdentifier('myappdb_user_id', 444);

      expect(Identifier).toHaveBeenCalledTimes(1);
      expect(Identifier).toHaveBeenCalledWith({
        visitorId: 'EXISTING_VISITOR_ID',
        identifierType: 'myappdb_user_id',
        value: 444
      });
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('overrides assignments that exist in the other visitor', done => {
      var jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true }),
        wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

      testContext.visitor._assignments = [jabbaPuppetAssignment, wineAssignment];

      testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(
        function() {
          expect(testContext.visitor.getAssignmentRegistry()).toEqual({
            jabba: testContext.jabbaCGIAssignment,
            wine: wineAssignment,
            blue_button: testContext.blueButtonAssignment
          });
          done();
        }.bind(this)
      );
    });

    it('changes visitor id', done => {
      testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(
        function() {
          expect(testContext.visitor.getId()).toBe('actual_visitor_id');
          done();
        }.bind(this)
      );
    });

    it('notifies any unsynced splits', done => {
      testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(
        function() {
          expect(AssignmentNotification).toHaveBeenCalledTimes(1);
          expect(AssignmentNotification).toHaveBeenCalledWith({
            visitor: testContext.visitor,
            assignment: testContext.blueButtonAssignment
          });
          expect(mockSend).toHaveBeenCalledTimes(1);

          done();
        }.bind(this)
      );
    });
  });

  describe('#setErrorLogger()', () => {
    it('throws an error if not provided with a function', () => {
      expect(
        function() {
          testContext.visitor.setErrorLogger('teapot');
        }.bind(this)
      ).toThrow('must provide function for errorLogger');
    });

    it('sets the error logger on the visitor', () => {
      var errorLogger = function() {};

      testContext.visitor.setErrorLogger(errorLogger);

      expect(testContext.visitor._errorLogger).toBe(errorLogger);
    });
  });

  describe('#logError()', () => {
    beforeEach(() => {
      testContext.errorLogger = jest.fn();
    });

    it('calls the error logger with the error message', () => {
      testContext.visitor.setErrorLogger(testContext.errorLogger);
      testContext.visitor.logError('something bad happened');

      expect(testContext.errorLogger).toHaveBeenCalledTimes(1);
      expect(testContext.errorLogger).toHaveBeenCalledWith('something bad happened');
    });

    it('calls the error logger with a null context', () => {
      testContext.visitor.setErrorLogger(testContext.errorLogger);
      testContext.visitor.logError('something bad happened');

      expect(testContext.errorLogger.mock.instances[0]).toBeNull();
    });

    it('does a console.error if the error logger was never set', () => {
      var consoleSpy = jest.spyOn(window.console, 'error');
      testContext.visitor.logError('something bad happened');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('something bad happened');
      expect(testContext.errorLogger).not.toHaveBeenCalled();
    });
  });

  describe('#setAnalytics()', () => {
    it('throws an error if not provided with an object', () => {
      expect(
        function() {
          testContext.visitor.setAnalytics('teapot');
        }.bind(this)
      ).toThrow('must provide object for setAnalytics');
    });

    it('sets the analytics object on the visitor', () => {
      var analytics = {};

      testContext.visitor.setAnalytics(analytics);

      expect(testContext.visitor.analytics).toBe(analytics);
    });
  });

  describe('#notifyUnsyncedAssignments', () => {
    it('notifies any unsynced assignments', () => {
      var wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false }),
        blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

      var visitor = new Visitor({
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
