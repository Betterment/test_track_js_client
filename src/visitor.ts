import type { Client, V1Assignment, V4Assignment, V4Split, V4VisitorConfig } from './client';
import { type Split, type SplitRegistry, createSplitRegistry } from './splitRegistry';

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
  assignments: Assignment[];
}>;

export type VisitorConfig = Readonly<{
  visitor: Visitor;
  splitRegistry: SplitRegistry;
}>;

export function parseAssignment(data: V1Assignment): Assignment {
  return {
    splitName: data.split_name,
    variant: data.variant,
    context: data.context
  };
}

function parseV4Assignment(data: V4Assignment): Assignment {
  return { splitName: data.split_name, variant: data.variant, context: null };
}

function parseV4Split(data: V4Split): Split {
  return {
    name: data.name,
    isFeatureGate: data.feature_gate,
    weighting: Object.fromEntries(data.variants.map(variant => [variant.name, variant.weight]))
  };
}

export function parseVisitorConfig(config: V4VisitorConfig): VisitorConfig {
  const splits = config.splits.map(parseV4Split);
  const splitRegistry = createSplitRegistry(splits);
  const assignments = config.visitor.assignments.map(parseV4Assignment);
  const visitor = { id: config.visitor.id, assignments };
  return { visitor, splitRegistry };
}

export function indexAssignments(assignments: Assignment[]): AssignmentRegistry {
  return Object.fromEntries(assignments.map(assignment => [assignment.splitName, assignment]));
}

export async function loadVisitorConfig(client: Client, visitorId: string): Promise<VisitorConfig> {
  try {
    const visitorConfig = await client.getVisitorConfig(visitorId);
    return parseVisitorConfig(visitorConfig);
  } catch {
    return {
      visitor: { id: visitorId, assignments: [] },
      splitRegistry: createSplitRegistry(null)
    };
  }
}
