import Assignment from './assignment';

type EventProperties = {
  TTVisitorID: string;
  SplitName: string;
  SplitVariant: string | null;
  SplitContext?: string;
};

declare global {
  interface Window {
    mixpanel: {
      track(eventName: string, properties: EventProperties, callback: (value: boolean) => void): void;
      identify(id: string): void;
      alias(id: string): void;
    };
  }
}

class MixpanelAnalytics {
  trackAssignment(visitorId: string, assignment: Assignment, callback: (value: boolean) => void) {
    const assignmentProperties = {
      TTVisitorID: visitorId,
      SplitName: assignment.getSplitName(),
      SplitVariant: assignment.getVariant(),
      SplitContext: assignment.getContext()
    };

    if (window.mixpanel) {
      window.mixpanel.track('SplitAssigned', assignmentProperties, callback);
    }
  }

  identify(visitorId: string) {
    if (window.mixpanel) {
      window.mixpanel.identify(visitorId);
    }
  }

  alias(visitorId: string) {
    if (window.mixpanel) {
      window.mixpanel.alias(visitorId);
    }
  }
}
export default MixpanelAnalytics;
