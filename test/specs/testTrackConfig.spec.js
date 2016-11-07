describe('TestTrackConfig', function() {
    var cookieName;

    beforeEach(function() {
        sandbox.stub(window, 'ConfigParser').returns({
            getConfig: function() {
                return {
                    url: "http://testtrack.dev",
                    cookieDomain: ".example.com",
                    cookieName: cookieName,
                    registry: {
                        jabba: { cgi: 50, puppet: 50 },
                        wine: { red: 50, white: 25, rose: 25 }
                    },
                    assignments: {
                        jabba: 'puppet',
                        wine: 'rose'
                    }
                };
            }
        });
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

    describe('.getCookieName()', function() {
        describe('when there is a configured cookie name', function() {
            beforeEach(function() {
                cookieName = 'custom_cookie_name';
            });

            it('grabs the correct value from the ConfigParser', function() {
                expect(TestTrackConfig.getCookieName()).to.equal('custom_cookie_name');
            });
        });

        describe('when there is no configured cookie name', function() {
            beforeEach(function() {
                cookieName = undefined;
            });

            it('uses the default cookie name', function() {
                expect(TestTrackConfig.getCookieName()).to.equal('tt_visitor_id');
            });
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
