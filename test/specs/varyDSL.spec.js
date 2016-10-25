describe('VaryDSL', function() {
    beforeEach(function() {
        this.splitRegistryStub = sandbox.stub(TestTrackConfig, 'getSplitRegistry').returns({
            element: {
                earth: 25,
                wind: 25,
                fire: 25,
                water: 25
            }
        });

        this.assignment = new Assignment({
            splitName: 'element',
            variant: 'earth',
            isUnsynced: true
        });

        this.visitor = new Visitor({
            id: 'visitor_id',
            assignments: [this.assignment]
        });
        this.logErrorStub = sandbox.stub(this.visitor, 'logError');

        this.vary = new VaryDSL({
            assignment: this.assignment,
            visitor: this.visitor
        });
    });

    it('requires an assignment', function() {
        expect(function() {
            var vary = new VaryDSL({
                visitor: this.visitor
            });
        }.bind(this)).to.throw('must provide assignment');
    });

    it('requires a visitor', function() {
        expect(function() {
            var vary = new VaryDSL({
                assignment: this.assignment
            });
        }.bind(this)).to.throw('must provide visitor');
    });

    describe('#when()', function() {
        it('throws an error if no variants are provided', function() {
            expect(function() {
                this.vary.when(function() {
                });
            }.bind(this)).to.throw('must provide at least one variant');
        });

        it('throws an error if handler is not provided', function() {
            expect(function() {
                this.vary.when('earth');
            }.bind(this)).to.throw('must provide handler for earth');
        });

        it('supports multiple variants', function() {
            var handler = sandbox.spy();
            this.vary.when('earth', 'wind', 'fire', handler);

            expect(this.vary._variantHandlers).to.deep.equal({
                earth: handler,
                wind: handler,
                fire: handler
            });
        });

        it('logs an error if given a variant that is not in the split registry', function() {
            var handler = sandbox.spy();
            this.vary.when('earth', 'wind', 'leeloo_multipass', handler);

            expect(this.vary._variantHandlers).to.deep.equal({
                earth: handler,
                wind: handler,
                leeloo_multipass: handler
            });

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('configures unknown variant leeloo_multipass');
        });

        it('does not log an error when the split registry is unavailable', function() {
            this.splitRegistryStub.returns(null);

            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.when('earth', 'wind', 'leeloo_multipass', sandbox.spy());

            expect(this.logErrorStub).not.to.be.called;
        });

        it('does not log an error for a variant with a 0 weight', function() {
            this.splitRegistryStub.returns({
                element: {
                    earth: 25,
                    wind: 25,
                    fire: 25,
                    water: 25,
                    leeloo_multipass: 0
                }
            });

            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.when('leeloo_multipass', sandbox.spy());

            expect(this.logErrorStub).not.to.be.called;
        });
    });

    describe('#default()', function() {
        it('throws an error if handler is not provided', function() {
            expect(function() {
                this.vary.default('earth');
            }.bind(this)).to.throw('must provide handler for earth');
        });

        it('throws an error if default is called more than once', function() {
            expect(function() {
                this.vary.default('fire', function() {
                });

                this.vary.default('water', function() {
                });
            }.bind(this)).to.throw('must provide exactly one `default`');
        });

        it('sets the default variant', function() {
            this.vary.default('water', function() {
            });

            expect(this.vary.getDefaultVariant()).to.equal('water');
        });

        it('adds the variant to the _variantHandlers object', function() {
            var handler = sandbox.spy();
            this.vary.default('water', handler);
            expect(this.vary._variantHandlers).to.deep.equal({
                water: handler
            });
        });

        it('logs an error if given a variant that is not in the split registry', function() {
            var handler = sandbox.spy();

            this.vary.default('leeloo_multipass', handler);

            expect(this.vary._variantHandlers).to.deep.equal({
                leeloo_multipass: handler
            });

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('configures unknown variant leeloo_multipass');
        });

        it('does not log an error when the split registry is unavailable', function() {
            this.splitRegistryStub.returns(null);

            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.default('leeloo_multipass', sandbox.spy());

            expect(this.logErrorStub).not.to.be.called;
        });

        it('does not log an error for a variant with a 0 weight', function() {
            this.splitRegistryStub.returns({
                element: {
                    earth: 25,
                    wind: 25,
                    fire: 25,
                    water: 25,
                    leeloo_multipass: 0
                }
            });

            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.default('leeloo_multipass', sandbox.spy());

            expect(this.logErrorStub).not.to.be.called;
        });
    });

    describe('#run()', function() {
        beforeEach(function() {
            this.whenHandler = sandbox.spy();
            this.defaultHandler = sandbox.spy();
        });

        it('throws an error if `default` was never called', function() {
            expect(function() {
                this.vary.run();
            }.bind(this)).to.throw('must provide exactly one `default`');
        });

        it('throws an error if `when` was never called', function() {
            expect(function() {
                this.vary.default('water', function() {
                });

                this.vary.run();
            }.bind(this)).to.throw('must provide at least one `when`');
        });

        it('runs the handler of the assigned variant', function() {
            this.vary.when('earth', this.whenHandler);
            this.vary.default('water', this.defaultHandler);

            this.vary.run();

            expect(this.whenHandler).to.be.calledOnce;
            expect(this.defaultHandler).not.to.be.called;
        });

        it('runs the default handler and is defaulted if the assigned variant is not represented', function() {
            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.when('fire', this.whenHandler);
            vary.default('water', this.defaultHandler);

            vary.run();

            expect(this.defaultHandler).to.be.calledOnce;
            expect(this.whenHandler).not.to.be.called;
            expect(vary.isDefaulted()).to.be.true;
        });

        it('is not defaulted if the assigned variant is represented as the default', function() {
            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.when('water', this.whenHandler);
            vary.default('earth', this.defaultHandler);

            vary.run();

            expect(this.defaultHandler).to.be.calledOnce;
            expect(this.whenHandler).not.to.be.called;
            expect(vary.isDefaulted()).to.be.false;
        });

        it('logs an error if not all variants are represented', function() {
            this.vary.when('earth', this.whenHandler);
            this.vary.default('fire', this.defaultHandler);

            this.vary.run();

            expect(this.logErrorStub).to.be.calledOnce;
            expect(this.logErrorStub).to.be.calledWithExactly('does not configure variants wind and water');
        });

        it('does not log an error when the split registry is unavailable', function() {
            this.splitRegistryStub.returns(null);

            var vary = new VaryDSL({
                assignment: this.assignment,
                visitor: this.visitor
            });

            vary.when('earth', this.whenHandler);
            vary.default('fire', this.defaultHandler);

            vary.run();

            expect(this.logErrorStub).not.to.be.called;
        });
    });
});
