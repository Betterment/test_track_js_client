import { getFalseVariant } from './abConfiguration';
import { indexAssignments, parseAssignment, type Assignment, type AssignmentRegistry } from './visitor';
import { nullAnalytics } from './analyticsProvider';
import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import { connectWebExtension, createWebExtension } from './webExtension';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';
import type { Visitor } from './visitor';
import type { StorageProvider } from './storageProvider';

export type VaryOptions = {
  context: string;
  defaultVariant: boolean | string;
};

export type AbOptions = {
  context: string;
  trueVariant?: string;
};

type Options = {
  client: Client;
  storage: StorageProvider;
  splitRegistry: SplitRegistry;
  visitor: Visitor;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

export class TestTrack {
  readonly #client: Client;
  readonly #storage: StorageProvider;
  readonly #splitRegistry: SplitRegistry;
  readonly #analytics: AnalyticsProvider;
  readonly #errorLogger: (errorMessage: string) => void;

  #visitorId: string;
  #assignments: AssignmentRegistry;

  static create(options: Options): TestTrack {
    const testTrack = new TestTrack(options);
    testTrack.#connectWebExtension();
    return testTrack;
  }

  constructor({ client, storage, splitRegistry, visitor, analytics, errorLogger }: Options) {
    this.#client = client;
    this.#storage = storage;
    this.#splitRegistry = splitRegistry;
    this.#visitorId = visitor.id;
    this.#assignments = indexAssignments(visitor.assignments);
    this.#errorLogger = errorLogger ?? (errorMessage => console.error(errorMessage));
    this.#analytics = analytics ?? nullAnalytics;
  }

  get visitorId(): string {
    return this.#visitorId;
  }

  get assignments(): ReadonlyArray<Assignment> {
    return Object.values(this.#assignments);
  }

  vary(splitName: string, options: VaryOptions): string {
    const existingAssignment = this.#assignments[splitName];
    if (existingAssignment?.variant) {
      return existingAssignment.variant;
    }

    const assignmentBucket = getAssignmentBucket({ splitName, visitorId: this.visitorId });
    const calculatedVariant = calculateVariant({ assignmentBucket, splitRegistry: this.#splitRegistry, splitName });
    const variant = calculatedVariant ?? options.defaultVariant.toString();
    const assignment = { splitName, variant, context: options.context, isUnsynced: false };

    this.#updateAssignments([assignment]);
    this.#sendAssignmentNotification(assignment);

    return variant;
  }

  ab(splitName: string, options: AbOptions): boolean {
    const trueVariant = options.trueVariant ?? 'true';
    const falseVariant = getFalseVariant({
      splitName,
      trueVariant,
      splitRegistry: this.#splitRegistry,
      errorLogger: this.#errorLogger
    });

    const variant = this.vary(splitName, {
      context: options.context,
      defaultVariant: falseVariant
    });

    return variant === trueVariant;
  }

  async logIn(identifierType: string, value: number): Promise<void> {
    await this.#linkIdentifier(identifierType, value);
    this.#analytics.identify(this.visitorId);
  }

  async signUp(identifierType: string, value: number): Promise<void> {
    await this.#linkIdentifier(identifierType, value);
    this.#analytics.alias(this.visitorId);
  }

  async #linkIdentifier(identifierType: string, value: number): Promise<void> {
    const { visitor } = await this.#client.postIdentifier({
      visitor_id: this.visitorId,
      identifier_type: identifierType,
      value: value.toString()
    });

    this.#visitorId = visitor.id;
    this.#storage.setVisitorId(visitor.id);
    this.#updateAssignments(visitor.assignments.map(parseAssignment));
  }

  #sendAssignmentNotification(assignment: Assignment): void {
    const split = this.#splitRegistry.getSplit(assignment.splitName);
    if (!split || split.isFeatureGate) return;

    try {
      this.#analytics.trackAssignment(this.visitorId, assignment);
    } catch (error) {
      this.#errorLogger(`test_track trackAssignment error: ${String(error)}`);
    }

    void this.#client
      .postAssignmentEvent({
        visitor_id: this.visitorId,
        split_name: assignment.splitName,
        context: assignment.context
      })
      .catch(error => {
        this.#errorLogger(`test_track persistAssignment error: ${error}`);
      });
  }

  #updateAssignments(assignments: Assignment[]): void {
    this.#assignments = { ...this.#assignments, ...indexAssignments(assignments) };
  }

  #connectWebExtension() {
    const webExtension = createWebExtension({
      client: this.#client,
      visitorId: this.#visitorId,
      splitRegistry: this.#splitRegistry,
      assignments: Object.values(this.#assignments),
      errorLogger: this.#errorLogger
    });

    connectWebExtension(webExtension);
  }
}
