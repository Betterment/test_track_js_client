describe('ABConfiguration', function() {
    beforeEach(function() {
        this.splitRegistryStub = sandbox.stub(TestTrackConfig, 'getSplitRegistry').returns({
            element: {
                earth: 25,
                wind: 25,
                fire: 25,
                water: 25
            },
            button_color: {
                red: 50,
                blue: 50
            }
        });

        this.visitor = new Visitor({
            id: 'visitor_id',
            assignments: []
        });
        this.logErrorStub = sandbox.stub(this.visitor, 'logError');
    });

    it('requires a splitName', function() {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                trueVariant: 'red',
                visitor: this.visitor
            });
        }.bind(this)).to.throw('must provide splitName');
    });

    it('requires an trueVariant', function() {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                visitor: this.visitor
            });
        }.bind(this)).to.throw('must provide trueVariant');
    });

    it('requires a visitor', function() {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                trueVariant: 'red'
            });
        }.bind(this)).to.throw('must provide visitor');
    });

    it('allows a null trueVariant', function() {
        expect(function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'button_color',
                trueVariant: null,
                visitor: this.visitor
            });
        }.bind(this)).not.to.throw();
    });

    describe('#getVariants()', function() {
        it('logs an error if the split does not have exactly two variants', function() {
            var abConfiguration = new ABConfiguration({
                splitName: 'element',
                trueVariant: 'water',
                visitor: this.visitor
            });

            abConfiguration.getVariants();

            expect(this.logErrorStub).to.be.calledWithExactly('A/B for element configures split with more than 2 variants');
        });

        it('does not log an error if the split registry is unavailable', function() {
            this.splitRegistryStub.returns(null);

            var abConfiguration = new ABConfiguration({
                splitName: 'element',
                trueVariant: 'water',
                visitor: this.visitor
            });

            abConfiguration.getVariants();

            expect(this.logErrorStub).not.to.be.called;
        });

        context('true variant', function() {
            it('is true if null was passed in during instantiation', function() {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: null,
                    visitor: this.visitor
                });

                expect(abConfiguration.getVariants().true).to.be.true;
            });

            it ('is whatever was passed in during instantiation', function() {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: this.visitor
                });

                expect(abConfiguration.getVariants().true).to.equal('red');
            });
        });

        context('false variant', function() {
            it('is the variant of the split that is not the true_variant', function() {
                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: this.visitor
                });

                expect(abConfiguration.getVariants().false).to.equal('blue');
            });

            it('is false when there is no split_registry', function() {
                this.splitRegistryStub.returns(null);

                var abConfiguration = new ABConfiguration({
                    splitName: 'button_color',
                    trueVariant: 'red',
                    visitor: this.visitor
                });

                expect(abConfiguration.getVariants().false).to.be.false;
            });

            it('is always the same if the split has more than two variants', function() {
                var abConfiguration = new ABConfiguration({
                    splitName: 'element',
                    trueVariant: 'earth',
                    visitor: this.visitor
                });

                expect(abConfiguration.getVariants().false).to.equal('fire');
            });
        });
    });
});
