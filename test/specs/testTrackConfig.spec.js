describe('TestTrackConfig', function() {
    beforeEach(function() {
        var configParser = new ConfigParser();
        sandbox.stub(configParser, 'getConfig').returns({
            url: "http://testtrack.dev",
            cookieDomain: ".example.com",
            registry: {
                jabba: { cgi: 50, puppet: 50 },
                wine: { red: 50, white: 25, rose: 25 }
            },
            assignments: {
                jabba: 'puppet',
                wine: 'rose'
            }
        });

        sandbox.stub(window, 'ConfigParser').returns(configParser);
    });

    describe('.getUrl()', function() {
        it('grabs the correct value from the ConfigParser', function() {
            expect(TestTrackConfig.getUrl()).to.equal('http://testtrack.dev');
        });
    });

    describe('.getCookieDomain()', function() {
        it('grabs the correct value from the ConfigParser', function() {
            expect(TestTrackConfig.getCookieDomain()).to.equal('.example.com');
        });
    });

    describe('.getSplitRegistry()', function() {
        it('grabs the correct value from the ConfigParser', function() {
            expect(TestTrackConfig.getSplitRegistry()).to.deep.equal({
                jabba: { cgi: 50, puppet: 50 },
                wine: { red: 50, white: 25, rose: 25 }
            });
        });
    });

    describe('.getAssignments()', function() {
        it('grabs the correct value from the ConfigParser', function() {
            expect(TestTrackConfig.getAssignments()).to.deep.equal([
                new Assignment({ splitName: 'jabba', variant: 'puppet', isUnsynced: false }),
                new Assignment({ splitName: 'wine', variant: 'rose', isUnsynced: false })
            ]);
        });
    });
});
