import { v4 as uuid } from 'uuid';
import Visitor from './visitor';
import Assignment from './assignment';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';

type LoadVisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  id: string | undefined;
  assignments: Assignment[] | null;
};

export async function loadVisitor(options: LoadVisitorOptions): Promise<Visitor> {
  const { id, client, splitRegistry } = options;

  if (!id) {
    return new Visitor({ client, splitRegistry, id: uuid(), assignments: [], ttOffline: false });
  }

  if (options.assignments) {
    return new Visitor({ client, splitRegistry, id, assignments: options.assignments, ttOffline: false });
  }

  try {
    const data = await client.getVisitor(id);
    const assignments = data.assignments.map(Assignment.fromV1Assignment);
    return new Visitor({ client, splitRegistry, id: data.id, assignments, ttOffline: false });
  } catch {
    return new Visitor({ client, splitRegistry, id, assignments: [], ttOffline: true });
  }
}
