import Assignment from './assignment';
import type { Client } from './client';
import type { AnalyticsProvider } from './analyticsProvider';

type Options = {
  client: Client;
  analytics: AnalyticsProvider;
  visitorId: string;
  assignment: Assignment;
  logError: (message: string) => void;
};

async function persistAssignment(options: Options, trackResult?: 'success' | 'failure'): Promise<void> {
  await options.client
    .postAssignmentEvent({
      visitor_id: options.visitorId,
      split_name: options.assignment.getSplitName(),
      context: options.assignment.getContext(),
      mixpanel_result: trackResult
    })
    .catch(error => {
      options.logError(`test_track persistAssignment error: ${error}`);
    });
}

export async function sendAssignmentNotification(options: Options): Promise<void> {
  // FIXME: The current implementation of this requires 2 HTTP requests
  // to guarantee that the server is notified of the assignment. By decoupling
  // the assignment notification from the analytics write success we can
  // bring this down to 1 HTTP request

  const firstPersist = persistAssignment(options);

  const secondPersist = new Promise(resolve => {
    options.analytics.trackAssignment(options.visitorId, options.assignment, success => {
      void persistAssignment(options, success ? 'success' : 'failure').then(resolve);
    });
  });

  await Promise.all([firstPersist, secondPersist]);
}
