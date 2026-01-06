import { request, toSearchParams, urlFor } from './api';
import Visitor from './visitor';
import Assignment from './assignment';
import type { Config } from './config';

type Options = {
  config: Config;
  visitor: Visitor;
  assignment: Assignment;
};

async function persistAssignment(config: Config, visitor: Visitor, assignment: Assignment, trackResult?: 'success' | 'failure') {
  await request({
    method: 'POST',
    url: urlFor(config, '/api/v1/assignment_event'),
    body: toSearchParams({
      visitor_id: visitor.getId(),
      split_name: assignment.getSplitName(),
      context: assignment.getContext(),
      mixpanel_result: trackResult
    })
  }).catch(error => {
    visitor.logError(`test_track persistAssignment error: ${error}`);
  });
}

export async function sendAssignmentNotification({ config, visitor, assignment }: Options): Promise<void> {
  // FIXME: The current implementation of this requires 2 HTTP requests
  // to guarantee that the server is notified of the assignment. By decoupling
  // the assignment notification from the analytics write success we can
  // bring this down to 1 HTTP request

  const firstPersist = persistAssignment(config, visitor, assignment);

  const secondPersist = new Promise(resolve => {
    visitor.analytics.trackAssignment(visitor.getId(), assignment, success =>
      persistAssignment(config, visitor, assignment, success ? 'success' : 'failure').then(resolve)
    );
  });

  await Promise.all([firstPersist, secondPersist]);
}
