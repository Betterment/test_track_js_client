import type { V1Assignment } from './client';

export type Assignment = Readonly<{
  splitName: string;
  variant: string | null;
  context: string | null;
  isUnsynced: boolean;
}>;

export type AssignmentRegistry = Readonly<{
  [splitName: string]: Assignment;
}>;

export function parseAssignment(data: V1Assignment): Assignment {
  return {
    splitName: data.split_name,
    variant: data.variant,
    context: data.context,
    isUnsynced: data.unsynced
  };
}

export function indexAssignments(assignments: Assignment[]): AssignmentRegistry {
  return Object.fromEntries(assignments.map(assignment => [assignment.splitName, assignment]));
}
