import { v4 as uuid } from 'uuid';
import type { Client, V1Assignment } from './client';

export type Assignment = Readonly<{
  splitName: string;
  variant: string | null;
  context: string | null;
  isUnsynced: boolean;
}>;

export type AssignmentRegistry = Readonly<{
  [splitName: string]: Assignment;
}>;

export type Visitor = Readonly<{
  id: string;
  assignments: Assignment[];
}>;

type LoadVisitorOptions = {
  client: Client;
  id: string | undefined;
  assignments: Assignment[] | null;
};

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

export async function loadVisitor(options: LoadVisitorOptions): Promise<Visitor> {
  const { id, client } = options;

  if (!id) {
    return { id: uuid(), assignments: [] };
  }

  if (options.assignments) {
    return { id, assignments: options.assignments };
  }

  try {
    const data = await client.getVisitor(id);
    const assignments = data.assignments.map(parseAssignment);
    return { id: data.id, assignments };
  } catch {
    return { id, assignments: [] };
  }
}
