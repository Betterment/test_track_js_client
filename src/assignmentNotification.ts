import TestTrack from './testTrack';
import Assignment from './assignment';
import type { Client } from './client';

type Options = {
  client: Client;
  visitor: TestTrack;
  assignment: Assignment;
};

async function persistAssignment(
  client: Client,
  visitor: TestTrack,
  assignment: Assignment,
  trackResult?: 'success' | 'failure'
): Promise<void> {
  await client
    .postAssignmentEvent({
      visitor_id: visitor.getId(),
      split_name: assignment.getSplitName(),
      context: assignment.getContext(),
      mixpanel_result: trackResult
    })
    .catch(error => {
      visitor.logError(`test_track persistAssignment error: ${error}`);
    });
}

export async function sendAssignmentNotification({ client, visitor, assignment }: Options): Promise<void> {
  // FIXME: The current implementation of this requires 2 HTTP requests
  // to guarantee that the server is notified of the assignment. By decoupling
  // the assignment notification from the analytics write success we can
  // bring this down to 1 HTTP request

  const firstPersist = persistAssignment(client, visitor, assignment);

  const secondPersist = new Promise(resolve => {
    visitor.analytics.trackAssignment(visitor.getId(), assignment, success => {
      void persistAssignment(client, visitor, assignment, success ? 'success' : 'failure').then(resolve);
    });
  });

  await Promise.all([firstPersist, secondPersist]);
}
