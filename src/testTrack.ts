import { getFalseVariant } from './abConfiguration';
import { indexAssignments, parseAssignment, type Assignment, type AssignmentRegistry } from './visitor';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
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
  isOffline?: boolean;
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
  #isOffline: boolean;

  static create(options: Options): TestTrack {
    const testTrack = new TestTrack(options);
    testTrack.#notifyUnsyncedAssignments();
    testTrack.#connectWebExtension();
    return testTrack;
  }

  constructor({ client, storage, splitRegistry, visitor, isOffline = false, analytics, errorLogger }: Options) {
    this.#client = client;
    this.#storage = storage;
    this.#splitRegistry = splitRegistry;
    this.#isOffline = isOffline;
    this.#visitorId = visitor.id;
    this.#assignments = indexAssignments(visitor.assignments);
    this.#errorLogger = errorLogger ?? (errorMessage => console.error(errorMessage));
    this.#analytics = analytics ?? mixpanelAnalytics;
  }

  get visitorId(): string {
    return this.#visitorId;
  }

  get assignments(): ReadonlyArray<Assignment> {
    return Object.values(this.#assignments);
  }

  vary(splitName: string, options: VaryOptions): string {
    const context = options.context;
    const defaultVariant = options.defaultVariant.toString();

    let assignment = this.#assignments[splitName];
    if (!assignment) {
      const assignmentBucket = getAssignmentBucket({ splitName, visitorId: this.visitorId });
      const variant = calculateVariant({ assignmentBucket, splitRegistry: this.#splitRegistry, splitName });

      if (!variant) {
        this.#isOffline = true;
      }

      assignment = { splitName, variant, context, isUnsynced: true };
      this.#updateAssignments([assignment]);
    }

    if (assignment.variant) {
      this.#notifyUnsyncedAssignments(); // Probably not necessary
      return assignment.variant;
    }

    this.#updateAssignments([{ ...assignment, variant: defaultVariant, isUnsynced: true, context }]);
    this.#notifyUnsyncedAssignments();
    return defaultVariant;
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
    this.#storage.setVisitorId(this.visitorId);
    this.#analytics.identify(this.visitorId);
  }

  async signUp(identifierType: string, value: number): Promise<void> {
    await this.#linkIdentifier(identifierType, value);
    this.#storage.setVisitorId(this.visitorId);
    this.#analytics.alias(this.visitorId);
  }

  async #linkIdentifier(identifierType: string, value: number): Promise<void> {
    const { visitor } = await this.#client.postIdentifier({
      visitor_id: this.visitorId,
      identifier_type: identifierType,
      value: value.toString()
    });

    this.#visitorId = visitor.id;
    this.#updateAssignments(visitor.assignments.map(parseAssignment));
    this.#notifyUnsyncedAssignments();
  }

  #notifyUnsyncedAssignments(): void {
    Object.values(this.#assignments)
      .filter(assignment => assignment.isUnsynced)
      .forEach(assignment => this.#sendAssignmentNotification(assignment));
  }

  #sendAssignmentNotification(assignment: Assignment): void {
    try {
      if (this.#isOffline) {
        return;
      }

      void sendAssignmentNotification({
        client: this.#client,
        visitorId: this.visitorId,
        analytics: this.#analytics,
        assignment,
        errorLogger: this.#errorLogger
      });

      this.#updateAssignments([{ ...assignment, isUnsynced: false }]);
    } catch (e) {
      this.#errorLogger(`test_track notify error: ${String(e)}`);
    }
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
