import type { Assignment } from './visitor';
import type { Client } from './client';
import type { AnalyticsProvider } from './analyticsProvider';

type Options = {
  client: Client;
  analytics: AnalyticsProvider;
  visitorId: string;
  assignment: Assignment;
  errorLogger: (message: string) => void;
};

export async function sendAssignmentNotification(options: Options): Promise<void> {
  options.analytics.trackAssignment(options.visitorId, options.assignment);

  await options.client
    .postAssignmentEvent({
      visitor_id: options.visitorId,
      split_name: options.assignment.splitName,
      context: options.assignment.context,
      mixpanel_result: 'success'
    })
    .catch(error => {
      options.errorLogger(`test_track persistAssignment error: ${error}`);
    });
}
