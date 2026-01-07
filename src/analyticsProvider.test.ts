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
    it('tracks SplitAssigned event with assignment properties', () => {
      const assignment = new Assignment({
        splitName: 'jabba',
        variant: 'cgi',
        context: 'spec',
        isUnsynced: false
      });

      const callback = vi.fn();
      mixpanelAnalytics.trackAssignment('visitor_id', assignment, callback);

      expect(mixpanel.track).toHaveBeenCalledWith(
        'SplitAssigned',
        {
          TTVisitorID: 'visitor_id',
          SplitName: 'jabba',
          SplitVariant: 'cgi',
          SplitContext: 'spec'
        },
        callback
      );
    });
  });

  describe('#alias()', () => {
    it('calls mixpanel.alias()', () => {
      mixpanelAnalytics.alias('id');
      expect(mixpanel.alias).toHaveBeenCalledWith('id');
    });
  });

  describe('#identify()', () => {
    it('calls mixpanel.identify()', () => {
      mixpanelAnalytics.identify('id');
      expect(mixpanel.identify).toHaveBeenCalledWith('id');
    });
  });
});
