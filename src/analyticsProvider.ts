import type { Assignment } from './visitor';

export interface AnalyticsProvider {
  trackAssignment(visitorId: string, assignment: Assignment, callback: (value: boolean) => void): void;
  identify(visitorId: string): void;
  alias(visitorId: string): void;
}

type EventProperties = {
  TTVisitorID: string;
  SplitName: string;
  SplitVariant: string | null;
  SplitContext: string | null;
};

declare global {
  interface Window {
    mixpanel?: {
      track(eventName: string, properties: EventProperties, callback: (value: boolean) => void): void;
      identify(id: string): void;
      alias(id: string): void;
    };
  }
}

export const mixpanelAnalytics: AnalyticsProvider = {
  trackAssignment(visitorId, assignment, callback) {
    const assignmentProperties = {
      TTVisitorID: visitorId,
      SplitName: assignment.splitName,
      SplitVariant: assignment.variant,
      SplitContext: assignment.context
    };

    window.mixpanel?.track('SplitAssigned', assignmentProperties, callback);
  },
  identify(visitorId: string) {
    window.mixpanel?.identify(visitorId);
  },
  alias(visitorId: string) {
    window.mixpanel?.alias(visitorId);
  }
};
