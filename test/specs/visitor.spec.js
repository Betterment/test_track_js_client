describe('Visitor', function() {
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

    beforeEach(function() {
        sandbox.stub(TestTrackConfig, 'getUrl').returns('http://testtrack.dev');
        this.bakedAssignmentsStub = sandbox.stub(TestTrackConfig, 'getAssignments').returns(null);
        this.splitRegistryStub = sandbox.stub(TestTrackConfig, 'getSplitRegistry').returns({
            jabba: { puppet: 50, cgi: 50 },
            wine: { red: 50, white: 25, rose: 25 },
            blue_button: { true: 50, false: 50 }
        });

        this.visitor = existingVisitor();
    });

    describe('instantiation', function() {

        it('requires an id', function() {
            expect(function() {
                new Visitor({
                    assignments: []
                });
            }).to.throw('must provide id');
        });

        it('requires assignments', function() {
            expect(function() {
                new Visitor({
                    id: 'visitor_id'
                });
            }).to.throw('must provide assignments');
        });
    });

    describe('.loadVisitor()', function() {
        beforeEach(function() {
            this.ajaxStub = sandbox.stub($, 'ajax').returns($.Deferred().resolve({
                id: 'server_visitor_id',
                assignments: [{
                    split_name: 'jabba',
                    variant: 'puppet',
                    unsynced: false
                }]
            }).promise());

            this.visitorConstructorSpy = sandbox.spy(window, 'Visitor');
        });

        it('is does not hit the server when not passed a visitorId', function(done) {
            sandbox.stub(uuid, 'v4').returns('generated_uuid');

            Visitor.loadVisitor(undefined).then(function(visitor) {
                expect(this.ajaxStub).not.to.be.called;

                expect(this.visitorConstructorSpy).to.be.calledOnce;
                expect(this.visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'generated_uuid',
                    assignments: [],
                    ttOffline: false
                });

                expect(visitor.getId()).to.equal('generated_uuid');
                expect(visitor.getAssignmentRegistry()).to.deep.equal({});

                done();
            }.bind(this));
        });

       it('does not hit the server when passed a visitorId and there are baked assignments', function(done) {
            var bakedAssignment = new Assignment({
                splitName: 'baked',
                variant: 'half',
                isUnsynced: false
            });

            this.bakedAssignmentsStub.returns([bakedAssignment]);

            Visitor.loadVisitor('baked_visitor_id').then(function(visitor) {
                expect(this.ajaxStub).not.to.be.called;

                expect(this.visitorConstructorSpy).to.be.calledOnce;
                expect(this.visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'baked_visitor_id',
                    assignments: [bakedAssignment],
                    ttOffline: false
                });

                expect(visitor.getId()).to.equal('baked_visitor_id');
                expect(visitor.getAssignmentRegistry()).to.deep.equal({ baked: bakedAssignment });

                done();
            }.bind(this));
        });

        it('it loads a visitor from the server for an existing visitor if there are no baked assignments', function(done) {
            this.sendStub = sandbox.stub();
            this.notificationStub = sandbox.stub(window, 'AssignmentNotification').returns({
                send: this.sendStub
            });

            this.ajaxStub.returns($.Deferred().resolve({
                id: 'puppeteer_visitor_id',
                assignments: [{
                    split_name: 'jabba',
                    variant: 'puppet',
                    context: 'mos_eisley',
                    unsynced: false
                }]
            }).promise());

            Visitor.loadVisitor('puppeteer_visitor_id').then(function(visitor) {
                expect(this.ajaxStub).to.be.calledOnce;
                expect(this.ajaxStub).to.be.calledWithExactly('http://testtrack.dev/api/v1/visitors/puppeteer_visitor_id', {
                    method: 'GET',
                    timeout: 5000
                });
                
                var jabbaAssignment = new Assignment({
                    splitName: 'jabba',
                    variant: 'puppet',
                    context: 'mos_eisley',
                    isUnsynced: false
                });

                expect(this.visitorConstructorSpy).to.be.calledOnce;
                expect(this.visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'puppeteer_visitor_id',
                    assignments: [jabbaAssignment],
                    ttOffline: false
                });

                expect(visitor.getId()).to.equal('puppeteer_visitor_id');
                expect(visitor.getAssignmentRegistry()).to.deep.equal({ jabba: jabbaAssignment });
                expect(visitor._getUnsyncedAssignments()).to.deep.equal([]);

                done();
            }.bind(this));
        });

        it('it builds a visitor in offline mode if the request fails', function(done) {
            this.ajaxStub.returns($.Deferred().reject().promise());

            Visitor.loadVisitor('failed_visitor_id').then(function(visitor) {
                expect(this.ajaxStub).to.be.calledOnce;
                expect(this.ajaxStub).to.be.calledWithExactly('http://testtrack.dev/api/v1/visitors/failed_visitor_id', {
                    method: 'GET',
                    timeout: 5000
                });

                expect(this.visitorConstructorSpy).to.be.calledOnce;
                expect(this.visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'failed_visitor_id',
                    assignments: [],
                    ttOffline: true
                });

                expect(visitor.getId()).to.equal('failed_visitor_id');
                expect(visitor.getAssignmentRegistry()).to.deep.equal({});

                done();
            }.bind(this));
        });
    });

    describe('#vary()', function() {
        beforeEach(function() {
            this.logErrorStub = sandbox.stub(this.visitor, 'logError'); // prevent error logging during the test run

            this.getVariantStub = sandbox.stub().returns('red');
            this.calculatorStub = sandbox.stub(window, 'VariantCalculator').returns({
                getVariant: this.getVariantStub
            });

            this.sendStub = sandbox.stub();
            this.notificationStub = sandbox.stub(window, 'AssignmentNotification').returns({
                send: this.sendStub
            });

            this.vary_jabba_split = function(visitor) {
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

            this.vary_wine_split = function(visitor) {
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

        it('throws an error if a variants object is not provided', function() {
            expect(function() {
                this.visitor.vary('wine', {
                    context: 'spec',
                    defaultVariant: 'white'
                });
            }.bind(this)).to.throw('must provide variants object to `vary` for wine');
        });

        it('throws an error if a context is not provided', function() {
            expect(function() {
                this.visitor.vary('wine', {
                    defaultVariant: 'white',
                    variants: {
                        white: function() {
                        },
                        red: function() {
                        }
                    }
                });
            }.bind(this)).to.throw('must provide context to `vary` for wine');
        });

        it('throws an error if a defaultVariant is not provided', function() {
            expect(function() {
                this.visitor.vary('wine', {
                    context: 'spec',
                    variants: {
                        white: function() {
                        },
                        red: function() {
                        }
                    }
                });
            }.bind(this)).to.throw('must provide defaultVariant to `vary` for wine');
        });

        it('throws an error if the defaultVariant is not represented in the variants object', function() {
            expect(function() {
                this.visitor.vary('wine', {
                    context: 'spec',
                    variants: {
                        white: function() {
                        },
                        red: function() {
                        }
                    },
                    defaultVariant: 'rose'
                });
            }.bind(this)).to.throw('defaultVariant: rose must be represented in variants object');
        });

        describe('New Assignment', function() {
            it('generates a new assignment via VariantCalculator', function() {
                this.vary_wine_split(this.visitor);

                expect(this.calculatorStub).to.be.calledOnce;
                expect(this.calculatorStub).to.be.calledWith({
                    visitor: this.visitor,
                    splitName: 'wine'
                });
                expect(this.getVariantStub).to.be.calledOnce;
            });

            it('adds new assignments to the assignment registry', function() {
                this.vary_wine_split(this.visitor);

                expect(this.visitor.getAssignmentRegistry()).to.deep.equal({
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

            it('sends an AssignmentNotification', function() {
                this.vary_wine_split(this.visitor);

                expect(this.notificationStub).to.be.calledOnce;
                expect(this.notificationStub).to.be.calledWithExactly({
                    visitor: this.visitor,
                    assignment: new Assignment({
                        splitName: 'wine',
                        variant: 'red',
                        context: 'spec',
                        isUnsynced: false
                    })
                });
                expect(this.sendStub).to.be.calledOnce;
                expect(this._newAssignedVariant).to.be.undefined;
            });

            it('only sends one AssignmentNotification with the default if it is defaulted', function() {
                this.getVariantStub.returns('rose');

                this.vary_wine_split(this.visitor);

                expect(this.notificationStub).to.be.calledOnce;
                expect(this.notificationStub).to.be.calledWithExactly({
                    visitor: this.visitor,
                    assignment: new Assignment({
                        splitName: 'wine',
                        variant: 'white',
                        context: 'spec',
                        isUnsynced: false
                    })
                });
                expect(this.sendStub).to.be.calledOnce;
            });

            it('logs an error if the AssignmentNotification throws an error', function() {
                this.sendStub.throws(new Error('something bad happened'));

                this.vary_wine_split(this.visitor);

                expect(this.notificationStub).to.be.calledOnce;
                expect(this.notificationStub).to.be.calledWithExactly({
                    visitor: this.visitor,
                    assignment: new Assignment({
                        splitName: 'wine',
                        variant: 'red',
                        context: 'spec',
                        isUnsynced: true
                    })
                });
                expect(this.sendStub).to.be.calledOnce;

                expect(this.logErrorStub).to.be.calledWithExactly('test_track notify error: Error: something bad happened');
            });
        });

        describe('Existing Assignment', function() {
            it('returns an existing assignment wihout generating', function() {
                this.vary_jabba_split(this.visitor);

                expect(this.calculatorStub).not.to.be.called;
            });

            it('does not send an AssignmentNotification', function() {
                this.vary_jabba_split(this.visitor);

                expect(this.notificationStub).not.to.be.called;
                expect(this.sendStub).not.to.be.called;
            });

            it('sends an AssignmentNotification with the default if it is defaulted', function() {
                this.visitor.vary('jabba', {
                    context: 'defaulted',
                    variants: {
                        furry_man: function() {
                        },
                        cgi: function() {
                        }
                    },
                    defaultVariant: 'cgi'
                });

                expect(this.notificationStub).to.be.calledOnce;
                expect(this.notificationStub).to.be.calledWithExactly({
                    visitor: this.visitor,
                    assignment: new Assignment({
                        splitName: 'jabba',
                        variant: 'cgi',
                        context: 'defaulted',
                        isUnsynced: false
                    })
                });
                expect(this.sendStub).to.be.calledOnce;
            });
        });

        describe('Offline Visitor', function() {
            beforeEach(function() {
                this.offlineVisitor = new Visitor({
                    id: 'offline_visitor_id',
                    assignments: [],
                    ttOffline: true
                });

                sandbox.stub(this.offlineVisitor, 'logError'); // prevent error logging during the test run
            });

            it('generates a new assignment via VariantCalculator', function() {
                this.vary_jabba_split(this.offlineVisitor);

                expect(this.calculatorStub).to.be.calledOnce;
                expect(this.calculatorStub).to.be.calledWith({
                    visitor: this.offlineVisitor,
                    splitName: 'jabba'
                });
                expect(this.getVariantStub).to.be.calledOnce;
            });

            it('does not send an AssignmentNotification', function() {
                this.vary_wine_split(this.offlineVisitor);

                expect(this.notificationStub).not.to.be.called;
                expect(this.sendStub).not.to.be.called;
            });
        });

        describe('Receives a null variant from VariantCalculator', function() {
            beforeEach(function() {
                this.getVariantStub.returns(null);
            });

            it('adds the assignment to the assignment registry', function() {
                this.vary_wine_split(this.visitor);

                expect(this.visitor.getAssignmentRegistry()).to.have.all.keys('jabba', 'wine');
            });

            it('does not send an AssignmentNotification', function() {
                this.vary_wine_split(this.visitor);

                expect(this.notificationStub).not.to.be.called;
                expect(this.sendStub).not.to.be.called;
            });
        });

        describe('Boolean split', function() {
            beforeEach(function() {
                this.trueHandler = sandbox.spy();
                this.falseHandler = sandbox.spy();

                this.vary_blue_button_split = function() {
                    this.visitor.vary('blue_button', {
                        context: 'spec',
                        variants: {
                            true: this.trueHandler,
                            false: this.falseHandler
                        },
                        defaultVariant: false
                    });
                }.bind(this);
            });

            it('chooses the correct handler when given a true boolean', function() {
                this.getVariantStub.returns('true');

                this.vary_blue_button_split();

                expect(this.trueHandler).to.be.calledOnce;
                expect(this.falseHandler).not.to.be.called;
            });

            it('picks the correct handler when given a false boolean', function() {
                this.getVariantStub.returns('false');

                this.vary_blue_button_split();

                expect(this.falseHandler).to.be.calledOnce;
                expect(this.trueHandler).not.to.be.called;
            });
        });
    });

    describe('#ab()', function() {
        beforeEach(function() {
            sandbox.stub(this.visitor, 'logError'); // prevent error logging during the test run
        });

        it('leverages vary to configure the split', function() {
            var varySpy = sandbox.spy(this.visitor, 'vary'),
                handler = sandbox.spy();

            this.visitor.ab('jabba', {
                context: 'spec',
                trueVariant: 'puppet',
                callback: handler
            });

            expect(varySpy).to.be.calledOnce;
            expect(varySpy).to.be.calledWith('jabba');
            expect(handler).to.be.calledOnce;
            expect(handler).to.be.calledWithExactly(true);
        });

        context('with an explicit trueVariant', function() {
            it('returns true when assigned to the trueVariant', function(done) {
                this.visitor._assignments = [new Assignment({
                    splitName: 'jabba',
                    variant: 'puppet',
                    isUnsynced: false
                })];

                this.visitor.ab('jabba', {
                    context: 'spec',
                    trueVariant: 'puppet',
                    callback: function(isPuppet) {
                        expect(isPuppet).to.be.true;
                        done();
                    }
                });
            });

            it('returns false when not assigned to the trueVariant', function(done) {
                this.visitor._assignments = [new Assignment({
                    splitName: 'jabba',
                    variant: 'cgi',
                    isUnsynced: false
                })];

                this.visitor.ab('jabba', {
                    context: 'spec',
                    trueVariant: 'puppet',
                    callback: function(isPuppet) {
                        expect(isPuppet).to.be.false;
                        done();
                    }
                });
            });
        });

        context('with an implicit trueVariant', function() {
            it('returns true when variant is true', function(done) {
                this.visitor._assignments = [new Assignment({
                    splitName: 'blue_button',
                    variant: 'true',
                    isUnsynced: false
                })];

                this.visitor.ab('blue_button', {
                    context: 'spec',
                    callback: function(isBlue) {
                        expect(isBlue).to.be.true;
                        done();
                    }
                });
            });

            it('returns false when variant is false', function(done) {
                this.visitor._assignments = [new Assignment({
                    splitName: 'blue_button',
                    variant: 'false',
                    isUnsynced: false
                })];

                this.visitor.ab('blue_button', {
                    context: 'spec',
                    callback: function(isBlue) {
                        expect(isBlue).to.be.false;
                        done();
                    }
                });
            });

            it('returns false when split variants are not true and false', function(done) {
                this.visitor.ab('jabba', {
                    context: 'spec',
                    callback: function(isTrue) {
                        expect(isTrue).to.be.false;
                        done();
                    }
                });
            });
        });
    });

    describe('#linkIdentifier()', function() {
        beforeEach(function() {
            var identifier = new Identifier({
                visitorId: this.visitor.getId(),
                identifierType: 'bettermentdb_user_id',
                value: 444
            });

            this.jabbaCGIAssignment = new Assignment({ splitName: 'jabba', variant: 'cgi', isUnsynced: false });
            this.blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

            this.identifierStub = sandbox.stub(window, 'Identifier').returns(identifier);
            this.saveStub = sandbox.stub(identifier, 'save', function() {
                this.actualVisitor = new Visitor({
                    id: 'actual_visitor_id',
                    assignments: [this.jabbaCGIAssignment, this.blueButtonAssignment]
                });

                return $.Deferred().resolve(this.actualVisitor).promise();
            }.bind(this));
        });

        it('saves an identifier', function() {
            this.visitor.linkIdentifier('bettermentdb_user_id', 444);

            expect(this.identifierStub).to.be.calledOnce;
            expect(this.identifierStub).to.be.calledWith({
                visitorId: 'EXISTING_VISITOR_ID',
                identifierType: 'bettermentdb_user_id',
                value: 444
            });
            expect(this.saveStub).to.be.calledOnce;
        });

        it('overrides assignments that exist in the other visitor' , function(done) {
            var jabbaPuppetAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: true }),
                wineAssignment = new Assignment({ splitName: 'wine', variant: 'white', isUnsynced: true });

            this.visitor._assignments = [jabbaPuppetAssignment, wineAssignment];

            this.visitor.linkIdentifier('bettermentdb_user_id', 444).then(function() {
                expect(this.visitor.getAssignmentRegistry()).to.deep.equal({
                    jabba: this.jabbaCGIAssignment,
                    wine: wineAssignment,
                    blue_button: this.blueButtonAssignment
                });
                done();
            }.bind(this));
        });

        it('changes visitor id', function(done) {
            this.visitor.linkIdentifier('bettermentdb_user_id', 444).then(function() {
                expect(this.visitor.getId()).to.equal('actual_visitor_id');
                done();
            }.bind(this));
        });

        it('notifies any unsynced splits', function(done) {
            this.sendStub = sandbox.stub();
            this.notificationStub = sandbox.stub(window, 'AssignmentNotification').returns({
                send: this.sendStub
            });

            this.visitor.linkIdentifier('bettermentdb_user_id', 444).then(function() {
                expect(this.notificationStub).to.be.calledOnce;
                expect(this.notificationStub).to.be.calledWithExactly({
                    visitor: this.visitor,
                    assignment: this.blueButtonAssignment
                });
                expect(this.sendStub).to.be.calledOnce;

                done();
            }.bind(this));
        });
    });

    describe('#setErrorLogger()', function() {
        it('throws an error if not provided with a function', function() {
            expect(function() {
                this.visitor.setErrorLogger('teapot');
            }.bind(this)).to.throw('must provide function for errorLogger');
        });

        it('sets the error logger on the visitor', function() {
            var errorLogger = function() {
            };

            this.visitor.setErrorLogger(errorLogger);

            expect(this.visitor._errorLogger).to.equal(errorLogger);
        });
    });

    describe('#logError()', function() {
        beforeEach(function() {
            this.errorLogger = sandbox.spy();
        });

        it('calls the error logger with the error message', function() {
            this.visitor.setErrorLogger(this.errorLogger);
            this.visitor.logError('something bad happened');

            expect(this.errorLogger).to.be.calledOnce;
            expect(this.errorLogger).to.be.calledWithExactly('something bad happened');
        });

        it('calls the error logger with a null context', function() {
            this.visitor.setErrorLogger(this.errorLogger);
            this.visitor.logError('something bad happened');

            expect(this.errorLogger.thisValues[0]).to.be.null;
        });

        it('does a console.error if the error logger was never set', function() {
            var consoleErrorStub = sandbox.stub(window.console, 'error');
            this.visitor.logError('something bad happened');

            expect(consoleErrorStub).to.be.calledOnce;
            expect(consoleErrorStub).to.be.calledWithExactly('something bad happened');
            expect(this.errorLogger).not.to.be.called;
        });
    });

    describe('#setAnalytics()', function() {
        it('throws an error if not provided with an object', function() {
            expect(function() {
                this.visitor.setAnalytics('teapot');
            }.bind(this)).to.throw('must provide object for setAnalytics');
        });

        it('sets the analytics object on the visitor', function() {
            var analytics = {};

            this.visitor.setAnalytics(analytics);

            expect(this.visitor.analytics).to.equal(analytics);
        });
    });

    describe('#notifyUnsyncedAssignments', function() {
        it('notifies any unsynced assignments', function() {
            this.sendStub = sandbox.stub();
            this.notificationStub = sandbox.stub(window, 'AssignmentNotification').returns({
                send: this.sendStub
            });

            var wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', isUnsynced: false }),
                blueButtonAssignment = new Assignment({ splitName: 'blue_button', variant: true, isUnsynced: true });

            var visitor = new Visitor({
                id: 'unsynced_visitor_id',
                assignments: [wineAssignment, blueButtonAssignment]
            });

            visitor.notifyUnsyncedAssignments();

            expect(this.notificationStub).to.be.calledOnce;
            expect(this.sendStub).to.be.calledOnce;

            expect(this.notificationStub).to.be.calledWithExactly({
                visitor: visitor,
                assignment: blueButtonAssignment
            });
        });
    });
});
