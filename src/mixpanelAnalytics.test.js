import Assignment from './assignment';
import MixpanelAnalytics from './mixpanelAnalytics';

describe('MixpanelAnalytics', () => {
  let testContext;
  beforeEach(() => {
    testContext = {};
    window.mixpanel = {
      track: jest.fn(),
      alias: jest.fn(),
      identify: jest.fn()
    };

    testContext.mixpanelAnalytics = new MixpanelAnalytics();
  });

  afterEach(() => {
    delete window.mixpanel;
  });

  describe('#trackAssignment()', () => {
    it('calls window.mixpanel.track()', () => {
      var assignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        context: 'spec',
        isUnsynced: false
      });

      var promise = testContext.mixpanelAnalytics.trackAssignment('visitor_id', assignment).then(() => {
        expect(window.mixpanel.track).toHaveBeenCalled();
        expect(window.mixpanel.track).toHaveBeenCalledWith(
          'SplitAssigned',
          {
            TTVisitorID: 'visitor_id',
            SplitName: 'jabba',
            SplitVariant: 'cgi',
            SplitContext: 'spec'
          },
          expect.any(Function)
        );
      });

      // call success
      window.mixpanel.track.mock.calls[0][2](true);

      return promise;
    });
  });

  describe('#alias()', () => {
    it('calls window.mixpanel.alias()', () => {
      testContext.mixpanelAnalytics.alias('id');

      expect(window.mixpanel.alias).toHaveBeenCalled();
      expect(window.mixpanel.alias).toHaveBeenCalledWith('id');
    });
  });

  describe('#identify()', () => {
    it('calls window.mixpanel.identify()', () => {
      testContext.mixpanelAnalytics.identify('id');

      expect(window.mixpanel.identify).toHaveBeenCalled();
      expect(window.mixpanel.identify).toHaveBeenCalledWith('id');
    });
  });
});
