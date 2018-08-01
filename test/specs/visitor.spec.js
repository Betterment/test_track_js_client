import Assignment from '../../src/assignment';
import Identifier from '../../src/identifier';
import TestTrackConfig from '../../src/testTrackConfig';
import Visitor from '../../src/visitor';

describe('Visitor', () => {
    let testContext;

    beforeEach(() => {
        testContext = {};
    });

    afterEach(() => {
        sinon.restore();
        TestTrackConfig._clear();
    });

    function newVisitor() {
        return new Visitor({
            id: uuid.v4(),
            assignments: []
        });
    }

    function existingVisitor(visitorId) {
        return new Visitor({
            id: visitorId || 'EXISTING_VISITOR_ID',
            assignments: [new Assignment({
                splitName: 'jabba',
                variant: 'puppet',
                isUnsynced: false
            })]
        });
    }

    beforeEach(() => {
        sinon.stub(TestTrackConfig, 'getUrl').returns('http://testtrack.dev');
        testContext.bakedAssignmentsStub = sinon.stub(TestTrackConfig, 'getAssignments').returns(null);
        testContext.splitRegistryStub = sinon.stub(TestTrackConfig, 'getSplitRegistry').returns({
            jabba: { puppet: 50, cgi: 50 },
            wine: { red: 50, white: 25, rose: 25 },
            blue_button: { true: 50, false: 50 }
        });

        testContext.visitor = existingVisitor();
    });

    describe('instantiation', () => {

        test('requires an id', () => {
            expect(function() {
                new Visitor({
                    assignments: []
                });
            }).toThrowError('must provide id');
        });

        test('requires assignments', () => {
            expect(function() {
                new Visitor({
                    id: 'visitor_id'
                });
            }).toThrowError('must provide assignments');
        });
    });

    describe('.loadVisitor()', () => {
        beforeEach(() => {
            testContext.ajaxStub = sinon.stub($, 'ajax').returns($.Deferred().resolve({
                id: 'server_visitor_id',
                assignments: [{
                    split_name: 'jabba',
                    variant: 'puppet',
                    unsynced: false
                }]
            }).promise());

            testContext.visitorConstructorSpy = sinon.spy(window, 'Visitor');
        });

        test('is does not hit the server when not passed a visitorId', done => {
            sinon.stub(uuid, 'v4').returns('generated_uuid');

            Visitor.loadVisitor(undefined).then(function(visitor) {
                expect(testContext.ajaxStub).not.to.be.called;

                expect(testContext.visitorConstructorSpy).to.be.calledOnce;
                expect(testContext.visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'generated_uuid',
                    assignments: [],
                    ttOffline: false
                });

                expect(visitor.getId()).toBe('generated_uuid');
                expect(visitor.getAssignmentRegistry()).toEqual({});

                done();
            }.bind(this));
        });

       test(
           'does not hit the server when passed a visitorId and there are baked assignments',
           done => {
                var bakedAssignment = new Assignment({
                    splitName: 'baked',
                    variant: 'half',
                    isUnsynced: false
                });

                testContext.bakedAssignmentsStub.returns([bakedAssignment]);

                Visitor.loadVisitor('baked_visitor_id').then(function(visitor) {
                    expect(testContext.ajaxStub).not.to.be.called;

                    expect(testContext.visitorConstructorSpy).to.be.calledOnce;
                    expect(testContext.visitorConstructorSpy).to.be.calledWithExactly({
                        id: 'baked_visitor_id',
                        assignments: [bakedAssignment],
                        ttOffline: false
                    });

                    expect(visitor.getId()).toBe('baked_visitor_id');
                    expect(visitor.getAssignmentRegistry()).toEqual({ baked: bakedAssignment });

                    done();
                }.bind(this));
            }
       );

        test(
            'it loads a visitor from the server for an existing visitor if there are no baked assignments',
            done => {
                testContext.sendStub = sinon.stub();
                testContext.notificationStub = sinon.stub(window, 'AssignmentNotification').returns({
                    send: testContext.sendStub
                });

                testContext.ajaxStub.returns($.Deferred().resolve({
                    id: 'puppeteer_visitor_id',
                    assignments: [{
                        split_name: 'jabba',
                        variant: 'puppet',
                        context: 'mos_eisley',
                        unsynced: false
                    }]
                }).promise());

                Visitor.loadVisitor('puppeteer_visitor_id').then(function(visitor) {
                    expect(testContext.ajaxStub).to.be.calledOnce;
                    expect(testContext.ajaxStub).to.be.calledWithExactly('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id', {
                        method: 'GET',
                        timeout: 5000
                    });

                    var jabbaAssignment = new Assignment({
                        splitName: 'jabba',
                        variant: 'puppet',
                        context: 'mos_eisley',
                        isUnsynced: false
                    });

                    expect(testContext.visitorConstructorSpy).to.be.calledOnce;
                    expect(testContext.visitorConstructorSpy).to.be.calledWithExactly({
                        id: 'puppeteer_visitor_id',
                        assignments: [jabbaAssignment],
                        ttOffline: false
                    });

                    expect(visitor.getId()).toBe('puppeteer_visitor_id');
                    expect(visitor.getAssignmentRegistry()).toEqual({ jabba: jabbaAssignment });
                    expect(visitor._getUnsyncedAssignments()).toEqual([]);

                    done();
                }.bind(this));
            }
        );

        test(
            'it builds a visitor in offline mode if the request fails',
            done => {
                testContext.ajaxStub.returns($.Deferred().reject().promise());

                Visitor.loadVisitor('failed_visitor_id').then(function(visitor) {
                    expect(testContext.ajaxStub).to.be.calledOnce;
                    expect(testContext.ajaxStub).to.be.calledWithExactly('http://testtrack.dev/api/v1/visitors/failed_visitor_id', {
                        method: 'GET',
                        timeout: 5000
                    });

                    expect(testContext.visitorConstructorSpy).to.be.calledOnce;
                    expect(testContext.visitorConstructorSpy).to.be.calledWithExactly({
                        id: 'failed_visitor_id',
                        assignments: [],
                        ttOffline: true
                    });

                    expect(visitor.getId()).toBe('failed_visitor_id');
                    expect(visitor.getAssignmentRegistry()).toEqual({});

                    done();
                }.bind(this));
            }
        );
    });

    describe('#vary()', () => {
        beforeEach(() => {
            testContext.logErrorStub = sinon.stub(testContext.visitor, 'logError'); // prevent error logging during the test run

            testContext.getVariantStub = sinon.stub().returns('red');
            testContext.calculatorStub = sinon.stub(window, 'VariantCalculator').returns({
                getVariant: testContext.getVariantStub
            });

            testContext.sendStub = sinon.stub();
            testContext.notificationStub = sinon.stub(window, 'AssignmentNotification').returns({
                send: testContext.sendStub
            });

            testContext.vary_jabba_split = function(visitor) {
                visitor.vary('jabba', {
                    context: 'spec',
                    variants: {
                        puppet: function() {
                        },
                        cgi: function() {
                        }
                    },
                    defaultVariant: 'cgi'
                });
            }.bind(this);

            testContext.vary_wine_split = function(visitor) {
                visitor.vary('wine', {
                    context: 'spec',
                    variants: {
                        red: function() {
                        },
                        white: function() {
                        }
                    },
                    defaultVariant: 'white'
                });
            }.bind(this);
        });

        test('throws an error if a variants object is not provided', () => {
            expect(function() {
                testContext.visitor.vary('wine', {
                    context: 'spec',
                    defaultVariant: 'white'
                });
            }.bind(this)).toThrowError('must provide variants object to `vary` for wine');
        });

        test('throws an error if a context is not provided', () => {
            expect(function() {
                testContext.visitor.vary('wine', {
                    defaultVariant: 'white',
                    variants: {
                        white: function() {
                        },
                        red: function() {
                        }
                    }
                });
            }.bind(this)).toThrowError('must provide context to `vary` for wine');
        });

        test('throws an error if a defaultVariant is not provided', () => {
            expect(function() {
                testContext.visitor.vary('wine', {
                    context: 'spec',
                    variants: {
                        white: function() {
                        },
                        red: function() {
                        }
                    }
                });
            }.bind(this)).toThrowError('must provide defaultVariant to `vary` for wine');
        });

        test(
            'throws an error if the defaultVariant is not represented in the variants object',
            () => {
                expect(function() {
                    testContext.visitor.vary('wine', {
                        context: 'spec',
                        variants: {
                            white: function() {
                            },
                            red: function() {
                            }
                        },
                        defaultVariant: 'rose'
                    });
                }.bind(this)).toThrowError('defaultVariant: rose must be represented in variants object');
            }
        );

        describe('New Assignment', () => {
            test('generates a new assignment via VariantCalculator', () => {
                testContext.vary_wine_split(testContext.visitor);

                expect(testContext.calculatorStub).to.be.calledOnce;
                expect(testContext.calculatorStub).to.be.calledWith({
                    visitor: testContext.visitor,
                    splitName: 'wine'
                });
                expect(testContext.getVariantStub).to.be.calledOnce;
            });

            test('adds new assignments to the assignment registry', () => {
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

            test('sends an AssignmentNotification', () => {
                testContext.vary_wine_split(testContext.visitor);

                expect(testContext.notificationStub).to.be.calledOnce;
                expect(testContext.notificationStub).to.be.calledWithExactly({
                    visitor: testContext.visitor,
                    assignment: new Assignment({
                        splitName: 'wine',
                        variant: 'red',
                        context: 'spec',
                        isUnsynced: false
                    })
                });
                expect(testContext.sendStub).to.be.calledOnce;
                expect(testContext._newAssignedVariant).toBeUndefined();
            });

            test(
                'only sends one AssignmentNotification with the default if it is defaulted',
                () => {
                    testContext.getVariantStub.returns('rose');

                    testContext.vary_wine_split(testContext.visitor);

                    expect(testContext.notificationStub).to.be.calledOnce;
                    expect(testContext.notificationStub).to.be.calledWithExactly({
                        visitor: testContext.visitor,
                        assignment: new Assignment({
                            splitName: 'wine',
                            variant: 'white',
                            context: 'spec',
                            isUnsynced: false
                        })
                    });
                    expect(testContext.sendStub).to.be.calledOnce;
                }
            );

            test(
                'logs an error if the AssignmentNotification throws an error',
                () => {
                    testContext.sendStub.throws(new Error('something bad happened'));

                    testContext.vary_wine_split(testContext.visitor);

                    expect(testContext.notificationStub).to.be.calledOnce;
                    expect(testContext.notificationStub).to.be.calledWithExactly({
                        visitor: testContext.visitor,
                        assignment: new Assignment({
                            splitName: 'wine',
                            variant: 'red',
                            context: 'spec',
                            isUnsynced: true
                        })
                    });
                    expect(testContext.sendStub).to.be.calledOnce;

                    expect(testContext.logErrorStub).to.be.calledWithExactly('test_track notify error: Error: something bad happened');
                }
            );
        });

        describe('Existing Assignment', () => {
            test('returns an existing assignment wihout generating', () => {
                testContext.vary_jabba_split(testContext.visitor);

                expect(testContext.calculatorStub).not.to.be.called;
            });

            test('does not send an AssignmentNotification', () => {
                testContext.vary_jabba_split(testContext.visitor);

                expect(testContext.notificationStub).not.to.be.called;
                expect(testContext.sendStub).not.to.be.called;
            });

            test(
                'sends an AssignmentNotification with the default if it is defaulted',
                () => {
                    testContext.visitor.vary('jabba', {
                        context: 'defaulted',
                        variants: {
                            furry_man: function() {
                            },
                            cgi: function() {
                            }
                        },
                        defaultVariant: 'cgi'
                    });

                    expect(testContext.notificationStub).to.be.calledOnce;
                    expect(testContext.notificationStub).to.be.calledWithExactly({
                        visitor: testContext.visitor,
                        assignment: new Assignment({
                            splitName: 'jabba',
                            variant: 'cgi',
                            context: 'defaulted',
                            isUnsynced: false
                        })
                    });
                    expect(testContext.sendStub).to.be.calledOnce;
                }
            );
        });

        describe('Offline Visitor', () => {
            beforeEach(() => {
                testContext.offlineVisitor = new Visitor({
                    id: 'offline_visitor_id',
                    assignments: [],
                    ttOffline: true
                });

                sinon.stub(testContext.offlineVisitor, 'logError'); // prevent error logging during the test run
            });

            test('generates a new assignment via VariantCalculator', () => {
                testContext.vary_jabba_split(testContext.offlineVisitor);

                expect(testContext.calculatorStub).to.be.calledOnce;
                expect(testContext.calculatorStub).to.be.calledWith({
                    visitor: testContext.offlineVisitor,
                    splitName: 'jabba'
                });
                expect(testContext.getVariantStub).to.be.calledOnce;
            });

            test('does not send an AssignmentNotification', () => {
                testContext.vary_wine_split(testContext.offlineVisitor);

                expect(testContext.notificationStub).not.to.be.called;
                expect(testContext.sendStub).not.to.be.called;
            });
        });

        describe('Receives a null variant from VariantCalculator', () => {
            beforeEach(() => {
                testContext.getVariantStub.returns(null);
            });

            test('adds the assignment to the assignment registry', () => {
                testContext.vary_wine_split(testContext.visitor);

                expect(testContext.visitor.getAssignmentRegistry()).toEqual(expect.arrayContaining(['jabba', 'wine']));
            });

            test('does not send an AssignmentNotification', () => {
                testContext.vary_wine_split(testContext.visitor);

                expect(testContext.notificationStub).not.to.be.called;
                expect(testContext.sendStub).not.to.be.called;
            });
        });

        describe('Boolean split', () => {
            beforeEach(() => {
                testContext.trueHandler = sinon.spy();
                testContext.falseHandler = sinon.spy();

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

            test('chooses the correct handler when given a true boolean', () => {
                testContext.getVariantStub.returns('true');

                testContext.vary_blue_button_split();

                expect(testContext.trueHandler).to.be.calledOnce;
                expect(testContext.falseHandler).not.to.be.called;
            });

            test('picks the correct handler when given a false boolean', () => {
                testContext.getVariantStub.returns('false');

                testContext.vary_blue_button_split();

                expect(testContext.falseHandler).to.be.calledOnce;
                expect(testContext.trueHandler).not.to.be.called;
            });
        });
    });

    describe('#ab()', () => {
        beforeEach(() => {
            sinon.stub(testContext.visitor, 'logError'); // prevent error logging during the test run
        });

        test('leverages vary to configure the split', () => {
            var varySpy = sinon.spy(testContext.visitor, 'vary'),
                handler = sinon.spy();

            testContext.visitor.ab('jabba', {
                context: 'spec',
                trueVariant: 'puppet',
                callback: handler
            });

            expect(varySpy).to.be.calledOnce;
            expect(varySpy).to.be.calledWith('jabba');
            expect(handler).to.be.calledOnce;
            expect(handler).to.be.calledWithExactly(true);
        });

        describe('with an explicit trueVariant', () => {
            test('returns true when assigned to the trueVariant', done => {
                testContext.visitor._assignments = [new Assignment({
                    splitName: 'jabba',
                    variant: 'puppet',
                    isUnsynced: false
                })];

                testContext.visitor.ab('jabba', {
                    context: 'spec',
                    trueVariant: 'puppet',
                    callback: function(isPuppet) {
                        expect(isPuppet).toBe(true);
                        done();
                    }
                });
            });

            test('returns false when not assigned to the trueVariant', done => {
                testContext.visitor._assignments = [new Assignment({
                    splitName: 'jabba',
                    variant: 'cgi',
                    isUnsynced: false
                })];

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
            test('returns true when variant is true', done => {
                testContext.visitor._assignments = [new Assignment({
                    splitName: 'blue_button',
                    variant: 'true',
                    isUnsynced: false
                })];

                testContext.visitor.ab('blue_button', {
                    context: 'spec',
                    callback: function(isBlue) {
                        expect(isBlue).toBe(true);
                        done();
                    }
                });
            });

            test('returns false when variant is false', done => {
                testContext.visitor._assignments = [new Assignment({
                    splitName: 'blue_button',
                    variant: 'false',
                    isUnsynced: false
                })];

                testContext.visitor.ab('blue_button', {
                    context: 'spec',
                    callback: function(isBlue) {
                        expect(isBlue).toBe(false);
                        done();
                    }
                });
            });

            test(
                'returns false when split variants are not true and false',
                done => {
                    testContext.visitor.ab('jabba', {
                        context: 'spec',
                        callback: function(isTrue) {
                            expect(isTrue).toBe(false);
                            done();
                        }
                    });
                }
            );
        });
    });

    describe('#linkIdentifier()', () => {
        beforeEach(() => {
            var identifier = new Identifier({
                visitorId: testContext.visitor.getId(),
                identifierType: 'myappdb_user_id',
                value: 444
            });

            testContext.jabbaCGIAssignment = new Assignment({ splitName: 'jabba', variant: 'cgi', isUnsynced: false });
            testContext.blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

            testContext.identifierStub = sinon.stub(window, 'Identifier').returns(identifier);
            testContext.saveStub = sinon.stub(identifier, 'save').callsFake(function() {
                testContext.actualVisitor = new Visitor({
                    id: 'actual_visitor_id',
                    assignments: [testContext.jabbaCGIAssignment, testContext.blueButtonAssignment]
                });

                return $.Deferred().resolve(testContext.actualVisitor).promise();
            }.bind(this));
        });

        test('saves an identifier', () => {
            testContext.visitor.linkIdentifier('myappdb_user_id', 444);

            expect(testContext.identifierStub).to.be.calledOnce;
            expect(testContext.identifierStub).to.be.calledWith({
                visitorId: 'EXISTING_VISITOR_ID',
                identifierType: 'myappdb_user_id',
                value: 444
            });
            expect(testContext.saveStub).to.be.calledOnce;
        });

        test('overrides assignments that exist in the other visitor', done => {
            var jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true }),
                wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

            testContext.visitor._assignments = [jabbaPuppetAssignment, wineAssignment];

            testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(function() {
                expect(testContext.visitor.getAssignmentRegistry()).toEqual({
                    jabba: testContext.jabbaCGIAssignment,
                    wine: wineAssignment,
                    blue_button: testContext.blueButtonAssignment
                });
                done();
            }.bind(this));
        });

        test('changes visitor id', done => {
            testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(function() {
                expect(testContext.visitor.getId()).toBe('actual_visitor_id');
                done();
            }.bind(this));
        });

        test('notifies any unsynced splits', done => {
            testContext.sendStub = sinon.stub();
            testContext.notificationStub = sinon.stub(window, 'AssignmentNotification').returns({
                send: testContext.sendStub
            });

            testContext.visitor.linkIdentifier('myappdb_user_id', 444).then(function() {
                expect(testContext.notificationStub).to.be.calledOnce;
                expect(testContext.notificationStub).to.be.calledWithExactly({
                    visitor: testContext.visitor,
                    assignment: testContext.blueButtonAssignment
                });
                expect(testContext.sendStub).to.be.calledOnce;

                done();
            }.bind(this));
        });
    });

    describe('#setErrorLogger()', () => {
        test('throws an error if not provided with a function', () => {
            expect(function() {
                testContext.visitor.setErrorLogger('teapot');
            }.bind(this)).toThrowError('must provide function for errorLogger');
        });

        test('sets the error logger on the visitor', () => {
            var errorLogger = function() {
            };

            testContext.visitor.setErrorLogger(errorLogger);

            expect(testContext.visitor._errorLogger).toBe(errorLogger);
        });
    });

    describe('#logError()', () => {
        beforeEach(() => {
            testContext.errorLogger = sinon.spy();
        });

        test('calls the error logger with the error message', () => {
            testContext.visitor.setErrorLogger(testContext.errorLogger);
            testContext.visitor.logError('something bad happened');

            expect(testContext.errorLogger).to.be.calledOnce;
            expect(testContext.errorLogger).to.be.calledWithExactly('something bad happened');
        });

        test('calls the error logger with a null context', () => {
            testContext.visitor.setErrorLogger(testContext.errorLogger);
            testContext.visitor.logError('something bad happened');

            expect(testContext.errorLogger.thisValues[0]).toBeNull();
        });

        test('does a console.error if the error logger was never set', () => {
            var consoleErrorStub = sinon.stub(window.console, 'error');
            testContext.visitor.logError('something bad happened');

            expect(consoleErrorStub).to.be.calledOnce;
            expect(consoleErrorStub).to.be.calledWithExactly('something bad happened');
            expect(testContext.errorLogger).not.to.be.called;
        });
    });

    describe('#setAnalytics()', () => {
        test('throws an error if not provided with an object', () => {
            expect(function() {
                testContext.visitor.setAnalytics('teapot');
            }.bind(this)).toThrowError('must provide object for setAnalytics');
        });

        test('sets the analytics object on the visitor', () => {
            var analytics = {};

            testContext.visitor.setAnalytics(analytics);

            expect(testContext.visitor.analytics).toBe(analytics);
        });
    });

    describe('#notifyUnsyncedAssignments', () => {
        test('notifies any unsynced assignments', () => {
            testContext.sendStub = sinon.stub();
            testContext.notificationStub = sinon.stub(window, 'AssignmentNotification').returns({
                send: testContext.sendStub
            });

            var wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false }),
                blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

            var visitor = new Visitor({
                id: 'unsynced_visitor_id',
                assignments: [wineAssignment, blueButtonAssignment]
            });

            visitor.notifyUnsyncedAssignments();

            expect(testContext.notificationStub).to.be.calledOnce;
            expect(testContext.sendStub).to.be.calledOnce;

            expect(testContext.notificationStub).to.be.calledWithExactly({
                visitor: visitor,
                assignment: blueButtonAssignment
            });
        });
    });
});
