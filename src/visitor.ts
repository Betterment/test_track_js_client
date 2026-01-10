import { v4 as uuid } from 'uuid';
import type { Client, V1Assignment } from './client';
import type { SplitRegistry } from './splitRegistry';

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

export type LoadedVisitor = Readonly<{
  visitor: Visitor;
  isOffline: boolean;
}>;

type LoadVisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
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

export async function loadVisitor(options: LoadVisitorOptions): Promise<LoadedVisitor> {
  const { id, client } = options;

  if (!id) {
    return { visitor: { id: uuid(), assignments: [] }, isOffline: false };
  }

  if (options.assignments) {
    return { visitor: { id, assignments: options.assignments }, isOffline: false };
  }

  try {
    const data = await client.getVisitor(id);
    const assignments = data.assignments.map(parseAssignment);
    return { visitor: { id: data.id, assignments }, isOffline: false };
  } catch {
    return { visitor: { id, assignments: [] }, isOffline: true };
  }
}
