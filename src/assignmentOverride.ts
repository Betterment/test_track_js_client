import { request, toSearchParams, urlFor } from './api';
import Assignment from './assignment';
import Visitor from './visitor';

type Options = {
  visitor: Visitor;
  assignment: Assignment;
  username: string;
  password: string;
};

export async function persistAssignmentOverride({ visitor, assignment, username, password }: Options): Promise<void> {
  await request({
    method: 'POST',
    url: urlFor(visitor.config, '/api/v1/assignment_override'),
    body: toSearchParams({
      visitor_id: visitor.getId(),
      split_name: assignment.getSplitName(),
      variant: assignment.getVariant(),
      context: assignment.getContext(),
      mixpanel_result: 'success' // we don't want to track overrides
    }),
    auth: {
      username,
      password
    }
  }).catch(error => {
    visitor.logError(`test_track persistAssignment error: ${error}`);
  });
}
