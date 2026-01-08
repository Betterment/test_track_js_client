import { v4 as uuid } from 'uuid';
import TestTrack from './testTrack';
import Assignment from './assignment';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';

type LoadVisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  id: string | undefined;
  assignments: Assignment[] | null;
};

export async function loadVisitor(options: LoadVisitorOptions): Promise<TestTrack> {
  const { id, client, splitRegistry } = options;

  if (!id) {
    return new TestTrack({ client, splitRegistry, id: uuid(), assignments: [], ttOffline: false });
  }

  if (options.assignments) {
    return new TestTrack({ client, splitRegistry, id, assignments: options.assignments, ttOffline: false });
  }

  try {
    const data = await client.getVisitor(id);
    const assignments = data.assignments.map(Assignment.fromV1Assignment);
    return new TestTrack({ client, splitRegistry, id: data.id, assignments, ttOffline: false });
  } catch {
    return new TestTrack({ client, splitRegistry, id, assignments: [], ttOffline: true });
  }
}
