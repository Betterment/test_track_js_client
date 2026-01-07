import Assignment from './assignment';
import { mixpanelAnalytics } from './analyticsProvider';

const mixpanel = {
  track: vi.fn(),
  alias: vi.fn(),
  identify: vi.fn()
};

describe('mixpanelAnalytics', () => {
  beforeEach(() => {
    window.mixpanel = mixpanel;
  });

  afterEach(() => {
    delete window.mixpanel;
  });

  describe('#trackAssignment()', () => {
    it('calls mixpanel.track()', () => {
      const assignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        context: 'spec',
        isUnsynced: false
      });

      mixpanelAnalytics.trackAssignment('visitor_id', assignment, () => {
        expect(mixpanel.track).toHaveBeenCalled();
        expect(mixpanel.track).toHaveBeenCalledWith(
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
      vi.mocked(mixpanel.track).mock.calls[0][2](true);
    });
  });

  describe('#alias()', () => {
    it('calls mixpanel.alias()', () => {
      mixpanelAnalytics.alias('id');

      expect(mixpanel.alias).toHaveBeenCalled();
      expect(mixpanel.alias).toHaveBeenCalledWith('id');
    });
  });

  describe('#identify()', () => {
    it('calls mixpanel.identify()', () => {
      mixpanelAnalytics.identify('id');

      expect(mixpanel.identify).toHaveBeenCalled();
      expect(mixpanel.identify).toHaveBeenCalledWith('id');
    });
  });
});
