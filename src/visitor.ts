import { v4 as uuid } from 'uuid';
import Assignment from './assignment';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';

type LoadVisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  id: string | undefined;
  assignments: Assignment[] | null;
};

export type Visitor = Readonly<{
  id: string;
  assignments: Assignment[];
}>;

export type LoadedVisitor = Readonly<{
  visitor: Visitor;
  isOffline: boolean;
}>;

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
    const assignments = data.assignments.map(Assignment.fromV1Assignment);
    return { visitor: { id: data.id, assignments }, isOffline: false };
  } catch {
    return { visitor: { id, assignments: [] }, isOffline: true };
  }
}
