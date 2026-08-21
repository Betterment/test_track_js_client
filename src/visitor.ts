import type { Client, V4Assignment, V4Split, V4VisitorConfig } from './client';
import { type Split, type SplitRegistry, createSplitRegistry } from './splitRegistry';
import type { StorageProvider } from './storageProvider';

export type Assignment = Readonly<{
  splitName: string;
  variant: string | null;
  context: string | null;
}>;

export type AssignmentRegistry = Readonly<{
  [splitName: string]: Assignment;
}>;

export type Visitor = Readonly<{
  id: string;
  assignments: ReadonlyArray<Assignment>;
}>;

export type VisitorConfig = Readonly<{
  visitor: Visitor;
  splitRegistry: SplitRegistry;
}>;

function parseAssignment(data: V4Assignment): Assignment {
  return { splitName: data.split_name, variant: data.variant, context: null };
}

function parseSplit(data: V4Split): Split {
  return {
    name: data.name,
    isFeatureGate: data.feature_gate,
    weighting: Object.fromEntries(data.variants.map(variant => [variant.name, variant.weight]))
  };
}

export function parseVisitorConfig(config: V4VisitorConfig): VisitorConfig {
  const splits = config.splits.map(parseSplit);
  const splitRegistry = createSplitRegistry(splits);
  const assignments = config.visitor.assignments.map(parseAssignment);
  const visitor = { id: config.visitor.id, assignments };
  return { visitor, splitRegistry };
}

export function indexAssignments(assignments: ReadonlyArray<Assignment>): AssignmentRegistry {
  return Object.fromEntries(assignments.map(assignment => [assignment.splitName, assignment]));
}

export async function loadVisitorConfig(
  client: Client,
  storage: StorageProvider,
  visitorId: string
): Promise<VisitorConfig> {
  try {
    const visitorConfig = await client.getVisitorConfig(visitorId);
    return parseVisitorConfig(visitorConfig);
  } catch {
    const cachedAssignments = storage.getAssignments();
    const cachedSplits = storage.getSplitRegistry();
    return {
      visitor: { id: visitorId, assignments: cachedAssignments ?? [] },
      splitRegistry: createSplitRegistry(cachedSplits ? [...cachedSplits] : null)
    };
  }
}
