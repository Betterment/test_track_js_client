import { getFalseVariant } from './abConfiguration';
import { Assignment } from './assignment';
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
};

type AssignmentRegistry = Readonly<{
  [splitName: string]: Assignment;
}>;

export class TestTrack {
  readonly #client: Client;
  readonly #storage: StorageProvider;
  readonly #splitRegistry: SplitRegistry;

  #visitorId: string;
  #assignments: AssignmentRegistry;
  #isOffline: boolean;
  #errorLogger: (errorMessage: string) => void;

  /** @deprecated No replacement */
  analytics: AnalyticsProvider = mixpanelAnalytics;

  constructor({ client, storage, splitRegistry, visitor, isOffline = false }: Options) {
    this.#client = client;
    this.#storage = storage;
    this.#splitRegistry = splitRegistry;
    this.#isOffline = isOffline;
    this.#errorLogger = errorMessage => console.error(errorMessage);
    this.#visitorId = visitor.id;
    this.#assignments = Object.fromEntries(
      visitor.assignments.map(assignment => [assignment.getSplitName(), assignment])
    );
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
      logError: message => this.logError(message)
    });
  }

  /** @deprecated Use `visitorId` */
  getId(): string {
    return this.visitorId;
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
      logError: message => this.logError(message)
    });

    if (isDefaulted) {
      assignment.setVariant(defaultVariant);
      assignment.setUnsynced(true);
      assignment.setContext(context);
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
      logError: message => this.logError(message)
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
    this.analytics.identify(this.visitorId);
  }

  async signUp(identifierType: string, value: number): Promise<void> {
    await this.linkIdentifier(identifierType, value);
    this.#storage.setVisitorId(this.visitorId);
    this.analytics.alias(this.visitorId);
  }

  /** @deprecated Use `logIn` or `signUp` */
  async linkIdentifier(identifierType: string, value: number): Promise<void> {
    const data = await this.#client.postIdentifier({
      visitor_id: this.visitorId,
      identifier_type: identifierType,
      value: value.toString()
    });

    const otherTestTrack = new TestTrack({
      client: this.#client,
      storage: this.#storage,
      splitRegistry: this.#splitRegistry,
      visitor: {
        id: data.visitor.id,
        assignments: data.visitor.assignments.map(Assignment.fromV1Assignment)
      }
    });

    this.#visitorId = otherTestTrack.visitorId;
    this.#assignments = { ...this.#assignments, ...otherTestTrack.getAssignmentRegistry() };
    this.notifyUnsyncedAssignments();
  }

  /** @deprecated Pass `errorLogger` to `initialize` */
  setErrorLogger(errorLogger: (errorMessage: string) => void): void {
    this.#errorLogger = errorLogger;
  }

  /** @deprecated No replacement */
  logError(errorMessage: string): void {
    this.#errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
  }

  /** @deprecated Pass `analytics` to `initialize` */
  setAnalytics(analytics: AnalyticsProvider): void {
    this.analytics = analytics;
  }

  /** @deprecated No replacement */
  notifyUnsyncedAssignments(): void {
    Object.values(this.#assignments)
      .filter(assignment => assignment.isUnsynced())
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

    const assignment = new Assignment({
      splitName,
      variant,
      context,
      isUnsynced: true
    });

    this.#assignments = { ...this.#assignments, [splitName]: assignment };
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
        analytics: this.analytics,
        assignment,
        logError: message => this.logError(message)
      });

      assignment.setUnsynced(false);
    } catch (e) {
      this.logError(`test_track notify error: ${String(e)}`);
    }
  }
}
