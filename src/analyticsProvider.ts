import type { Assignment } from './visitor';

export type AnalyticsProvider = {
  trackAssignment: (visitorId: string, assignment: Assignment) => void;
  identify: (visitorId: string) => void;
  alias: (visitorId: string) => void;
};

export const nullAnalytics: AnalyticsProvider = {
  trackAssignment: () => {},
  identify: () => {},
  alias: () => {}
};
