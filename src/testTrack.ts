import { getFalseVariant } from './abConfiguration';
import { indexAssignments, parseVisitorConfig, type Assignment, type AssignmentRegistry } from './visitor';
import { nullAnalytics } from './analyticsProvider';
import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import { connectWebExtension, createWebExtension } from './webExtension';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';
import type { Visitor } from './visitor';
import type { StorageProvider } from './storageProvider';
import type { IdentifierType, Schema, SplitName, VariantName } from './schema';

export type VaryOptions<V extends string> = {
  context: string;
  defaultVariant: 'true' | 'false' extends V ? V | boolean : V;
};

export type AbOptions<V extends string> = {
  context: string;
  trueVariant?: V;
};

type Options = {
  client: Client;
  storage: StorageProvider;
  splitRegistry: SplitRegistry;
  visitor: Visitor;
  analytics?: AnalyticsProvider;
  errorLogger?: (errorMessage: string) => void;
};

export class TestTrack<S extends Schema> {
  readonly #client: Client;
  readonly #storage: StorageProvider;
  readonly #analytics: AnalyticsProvider;
  readonly #errorLogger: (errorMessage: string) => void;

  #visitorId: string;
  #assignments: AssignmentRegistry;
  #splitRegistry: SplitRegistry;

  static create<S extends Schema>(options: Options): TestTrack<S> {
    const testTrack = new TestTrack<S>(options);
    testTrack.#saveVisitorId();
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

  /** @internal */
  get assignments(): ReadonlyArray<Assignment> {
    return Object.values(this.#assignments);
  }

  vary<N extends SplitName<S>>(splitName: N, options: VaryOptions<VariantName<S, N>>): string {
    const existingAssignment = this.#assignments[splitName];
    if (existingAssignment?.variant) {
      return existingAssignment.variant;
    }

    const assignmentBucket = getAssignmentBucket({ splitName, visitorId: this.visitorId });
    const calculatedVariant = calculateVariant({ assignmentBucket, splitRegistry: this.#splitRegistry, splitName });
    const variant = calculatedVariant ?? options.defaultVariant.toString();
    const assignment = { splitName, variant, context: options.context };

    this.#assignments = { ...this.#assignments, ...indexAssignments([assignment]) };
    this.#sendAssignmentNotification(assignment);

    return variant;
  }

  ab<N extends SplitName<S>>(splitName: N, options: AbOptions<VariantName<S, N>>): boolean {
    const trueVariant = options.trueVariant ?? 'true';
    const falseVariant = getFalseVariant({
      splitName,
      trueVariant,
      splitRegistry: this.#splitRegistry,
      errorLogger: this.#errorLogger
    });

    const variant = this.vary(splitName, {
      context: options.context,
      defaultVariant: falseVariant as VariantName<S, N>
    });

    return variant === trueVariant;
  }

  async logIn(identifierType: IdentifierType<S>, value: string): Promise<void> {
    await this.#linkIdentifier(identifierType, value);
    this.#analytics.identify(this.visitorId);
  }

  async signUp(identifierType: IdentifierType<S>, value: string): Promise<void> {
    await this.#linkIdentifier(identifierType, value);
    this.#analytics.alias(this.visitorId);
  }

  async #linkIdentifier(identifierType: string, value: string): Promise<void> {
    const response = await this.#client.postIdentifier({
      visitor_id: this.visitorId,
      identifier_type: identifierType,
      value
    });

    const { visitor, splitRegistry } = parseVisitorConfig(response);

    this.#visitorId = visitor.id;
    this.#assignments = indexAssignments(visitor.assignments);
    this.#splitRegistry = splitRegistry;
    this.#saveVisitorId();
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

  #saveVisitorId(): void {
    this.#storage.setVisitorId(this.visitorId);
  }

  #connectWebExtension() {
    const webExtension = createWebExtension({
      client: this.#client,
      visitorId: this.visitorId,
      splitRegistry: this.#splitRegistry,
      assignments: Object.values(this.#assignments),
      errorLogger: this.#errorLogger
    });

    connectWebExtension(webExtension);
  }
}
