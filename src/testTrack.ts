import { getFalseVariant } from './abConfiguration';
import { indexAssignments, parseAssignment, type Assignment, type AssignmentRegistry } from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import { vary, type Variants } from './vary';
import { createWebExtension, type WebExtension } from './webExtension';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';
import type { Visitor } from './visitor';
import type { StorageProvider } from './storageProvider';

export type VaryOptions = {
  /** @deprecated Use the return value instead */
  variants?: Variants;
  context: string;
  defaultVariant: boolean | string;
};

export type AbOptions = {
  /** @deprecated Use the return value instead */
  callback?: (assignment: boolean) => void;
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

  /** @deprecated No replacement */
  get _crx(): WebExtension {
    return createWebExtension({
      client: this.#client,
      visitorId: this.#visitorId,
      splitRegistry: this.#splitRegistry,
      assignments: Object.values(this.#assignments),
      errorLogger: this.#errorLogger
    });
  }

  /** @deprecated No replacement */
  getAssignmentRegistry(): AssignmentRegistry {
    return this.#assignments;
  }

  vary(splitName: string, options: VaryOptions): string {
    const defaultVariant = options.defaultVariant.toString();
    const { variants, context } = options;

    const assignment = this.#getAssignmentFor(splitName, context);
    const { isDefaulted, variant } = vary({
      assignment,
      defaultVariant,
      variants,
      splitRegistry: this.#splitRegistry,
      errorLogger: this.#errorLogger
    });

    if (isDefaulted) {
      this.#updateAssignments([{ ...assignment, variant: defaultVariant, isUnsynced: true, context }]);
    }

    this.notifyUnsyncedAssignments();
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
      defaultVariant: falseVariant,
      variants: {
        [trueVariant]: () => options.callback?.(true),
        [falseVariant]: () => options.callback?.(false)
      }
    });

    return variant === trueVariant;
  }

  async logIn(identifierType: string, value: number): Promise<void> {
    await this.linkIdentifier(identifierType, value);
    this.#storage.setVisitorId(this.visitorId);
    this.#analytics.identify(this.visitorId);
  }

  async signUp(identifierType: string, value: number): Promise<void> {
    await this.linkIdentifier(identifierType, value);
    this.#storage.setVisitorId(this.visitorId);
    this.#analytics.alias(this.visitorId);
  }

  /** @deprecated Use `logIn` or `signUp` */
  async linkIdentifier(identifierType: string, value: number): Promise<void> {
    const { visitor } = await this.#client.postIdentifier({
      visitor_id: this.visitorId,
      identifier_type: identifierType,
      value: value.toString()
    });

    this.#visitorId = visitor.id;
    this.#updateAssignments(visitor.assignments.map(parseAssignment));
    this.notifyUnsyncedAssignments();
  }

  /** @deprecated No replacement */
  notifyUnsyncedAssignments(): void {
    Object.values(this.#assignments)
      .filter(assignment => assignment.isUnsynced)
      .forEach(assignment => this.#sendAssignmentNotification(assignment));
  }

  #getAssignmentFor(splitName: string, context: string): Assignment {
    return this.#assignments[splitName] || this.#generateAssignmentFor(splitName, context);
  }

  #generateAssignmentFor(splitName: string, context: string): Assignment {
    const assignmentBucket = getAssignmentBucket({ splitName, visitorId: this.visitorId });
    const variant = calculateVariant({
      assignmentBucket,
      splitRegistry: this.#splitRegistry,
      splitName
    });

    if (!variant) {
      this.#isOffline = true;
    }

    const assignment: Assignment = { splitName, variant, context, isUnsynced: true };
    this.#updateAssignments([assignment]);
    return assignment;
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
}
