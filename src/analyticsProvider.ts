import type Assignment from './assignment';

export interface AnalyticsProvider {
  trackAssignment(visitorId: string, assignment: Assignment, callback: (value: boolean) => void): void;
  identify(visitorId: string): void;
  alias(visitorId: string): void;
}
