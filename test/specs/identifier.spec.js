describe('Identifier', function() {
    var identifierOptions;

    function createIdentifier() {
        return new Identifier(identifierOptions);
    }

    beforeEach(function() {
        sandbox.stub(TestTrackConfig, 'getUrl').returns('http://testtrack.dev');

        identifierOptions = {
            visitorId: 'transient_visitor_id',
            identifierType: 'myappdb_user_id',
            value: 444
        };

        this.identifier = createIdentifier();
    });

    it('requires a visitorId', function() {
        expect(function() {
            delete identifierOptions.visitorId;
            createIdentifier();
        }).to.throw('must provide visitorId');
    });

    it('requires a identifierType', function() {
        expect(function() {
            delete identifierOptions.identifierType;
            createIdentifier();
        }).to.throw('must provide identifierType');
    });

    it('requires a value', function() {
        expect(function() {
            delete identifierOptions.value;
            createIdentifier();
        }).to.throw('must provide value');
    });

    describe('#save()', function() {
        beforeEach(function() {
            this.ajaxStub = sandbox.stub($, 'ajax');
        });

        it('hits the test track server with the correct parameters', function() {
            this.ajaxStub.returns($.Deferred().promise());

            this.identifier.save();

            expect(this.ajaxStub).to.be.calledOnce;
            expect(this.ajaxStub).to.be.calledWith('http://testtrack.dev/api/v1/identifier', {
                method: 'POST',
                dataType: 'json',
                crossDomain: true,
                data: {
                    identifier_type: 'myappdb_user_id',
                    value: 444,
                    visitor_id: 'transient_visitor_id'
                }
            });
        });

        it('responds with a Visitor instance with the attributes from the server', function(done) {
            var visitorConstructorSpy = sandbox.spy(window, 'Visitor'),
                jabbaAssignment = new Assignment({ splitName: 'jabba', variant: 'puppet', context: 'mos_eisley', isUnsynced: true }),
                wineAssignment = new Assignment({ splitName: 'wine', variant: 'red', context: 'napa', isUnsynced: false });

            this.ajaxStub.returns($.Deferred().resolve({
                visitor: {
                    id: 'actual_visitor_id',
                    assignments: [{
                        split_name: 'jabba',
                        variant: 'puppet',
                        context: 'mos_eisley',
                        unsynced: true
                    }, {
                        split_name: 'wine',
                        variant: 'red',
                        context: 'napa',
                        unsynced: false
                    }]
                }
            }).promise());

            this.identifier.save().then(function(visitor) {
                expect(visitorConstructorSpy).to.be.calledOnce;
                expect(visitorConstructorSpy).to.be.calledWithExactly({
                    id: 'actual_visitor_id',
                    assignments: [jabbaAssignment, wineAssignment]
                });

                expect(visitor.getId()).to.equal('actual_visitor_id');
                expect(visitor.getAssignmentRegistry()).to.deep.equal({ jabba: jabbaAssignment, wine: wineAssignment });
                done();
            });
        });
    });
});
