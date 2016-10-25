describe('MixpanelAnalytics', function() {
    beforeEach(function() {
        window.mixpanel = {
            track: function() {},
            alias: function() {},
            identify: function() {},
        };

        this.mixpanelTrackStub = sandbox.stub(window.mixpanel, 'track');
        this.mixpanelAliasStub = sandbox.stub(window.mixpanel, 'alias');
        this.mixpanelIdentifyStub = sandbox.stub(window.mixpanel, 'identify');

        this.mixpanelAnalytics = new MixpanelAnalytics();
    });

    afterEach(function() {
        delete window.mixpanel;
    });

    describe('#trackAssignment()', function() {
        it('calls window.mixpanel.track()', function() {
            var callback = function() {};

            var assignment = new Assignment({
                splitName: 'jabba',
                variant: 'cgi',
                context: 'spec',
                isUnsynced: false
            });

            this.mixpanelAnalytics.trackAssignment('visitor_id', assignment, callback);

            expect(this.mixpanelTrackStub).to.be.calledOnce;
            expect(this.mixpanelTrackStub).to.be.calledWithExactly(
                'SplitAssigned',
                {
                    TTVisitorID: 'visitor_id',
                    SplitName: 'jabba',
                    SplitVariant: 'cgi',
                    SplitContext: 'spec'
                },
                callback);
        });
    });

    describe('#alias()', function() {
        it('calls window.mixpanel.alias()', function() {
            this.mixpanelAnalytics.alias('id');

            expect(this.mixpanelAliasStub).to.be.calledOnce;
            expect(this.mixpanelAliasStub).to.be.calledWithExactly('id');
        });
    });

    describe('#identify()', function() {
        it('calls window.mixpanel.identify()', function() {
            this.mixpanelAnalytics.identify('id');

            expect(this.mixpanelIdentifyStub).to.be.calledOnce;
            expect(this.mixpanelIdentifyStub).to.be.calledWithExactly('id');
        });
    });
});
