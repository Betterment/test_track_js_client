import Assignment from './assignment';
import MixpanelAnalytics from './mixpanelAnalytics';

describe('MixpanelAnalytics', () => {
  let mixpanelAnalytics: MixpanelAnalytics;

  beforeEach(() => {
    window.mixpanel = {
      track: jest.fn(),
      alias: jest.fn(),
      identify: jest.fn()
    };

    mixpanelAnalytics = new MixpanelAnalytics();
  });

  afterEach(() => {
    // @ts-expect-error Cleaning up test property
    delete window.mixpanel;
  });

  describe('#trackAssignment()', () => {
    it('calls window.mixpanel.track()', () => {
      const assignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        context: 'spec',
        isUnsynced: false
      });

      mixpanelAnalytics.trackAssignment('visitor_id', assignment, () => {
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
      jest.mocked(window.mixpanel.track).mock.calls[0][2](true);
    });
  });

  describe('#alias()', () => {
    it('calls window.mixpanel.alias()', () => {
      mixpanelAnalytics.alias('id');

      expect(window.mixpanel.alias).toHaveBeenCalled();
      expect(window.mixpanel.alias).toHaveBeenCalledWith('id');
    });
  });

  describe('#identify()', () => {
    it('calls window.mixpanel.identify()', () => {
      mixpanelAnalytics.identify('id');

      expect(window.mixpanel.identify).toHaveBeenCalled();
      expect(window.mixpanel.identify).toHaveBeenCalledWith('id');
    });
  });
});
