import { getFalseVariant } from './abConfiguration';
import Assignment from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
import { calculateVariant, getAssignmentBucket } from './calculateVariant';
import { vary, type Variants } from './vary';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';

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

export type Visitor = Readonly<{
  id: string;
  assignments: Assignment[];
}>;

type TestTrackOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  visitor: Visitor;
  ttOffline?: boolean;
};

type AssignmentRegistry = Readonly<{
  [splitName: string]: Assignment;
}>;

export default class TestTrack {
  readonly #client: Client;
  readonly #splitRegistry: SplitRegistry;

  #id: string;
  #assignments: AssignmentRegistry;
  #ttOffline: boolean | undefined;
  #errorLogger: (errorMessage: string) => void;

  analytics: AnalyticsProvider;

  constructor({ client, splitRegistry, visitor, ttOffline }: TestTrackOptions) {
    this.#client = client;
    this.#splitRegistry = splitRegistry;
    this.#id = visitor.id;
    this.#ttOffline = ttOffline;
    this.#errorLogger = errorMessage => console.error(errorMessage);
    this.analytics = mixpanelAnalytics;
    this.#assignments = Object.fromEntries(
      visitor.assignments.map(assignment => [assignment.getSplitName(), assignment])
    );
  }

  getId(): string {
    return this.#id;
  }

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

  setErrorLogger(errorLogger: (errorMessage: string) => void): void {
    this.#errorLogger = errorLogger;
  }

  logError(errorMessage: string): void {
    this.#errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
  }

  async linkIdentifier(identifierType: string, value: number): Promise<void> {
    const data = await this.#client.postIdentifier({
      visitor_id: this.getId(),
      identifier_type: identifierType,
      value: value.toString()
    });

    const otherVisitor = new TestTrack({
      client: this.#client,
      splitRegistry: this.#splitRegistry,
      visitor: {
        id: data.visitor.id,
        assignments: data.visitor.assignments.map(Assignment.fromV1Assignment)
      }
    });

    this.#id = otherVisitor.getId();
    this.#assignments = { ...this.#assignments, ...otherVisitor.getAssignmentRegistry() };
    this.notifyUnsyncedAssignments();
  }

  setAnalytics(analytics: AnalyticsProvider): void {
    this.analytics = analytics;
  }

  notifyUnsyncedAssignments(): void {
    Object.values(this.getAssignmentRegistry())
      .filter(assignment => assignment.isUnsynced())
      .forEach(assignment => this.#sendAssignmentNotification(assignment));
  }

  #getAssignmentFor(splitName: string, context: string): Assignment {
    return this.getAssignmentRegistry()[splitName] || this.#generateAssignmentFor(splitName, context);
  }

  #generateAssignmentFor(splitName: string, context: string): Assignment {
    const assignmentBucket = getAssignmentBucket({ splitName, visitorId: this.getId() });
    const variant = calculateVariant({
      assignmentBucket,
      splitRegistry: this.#splitRegistry,
      splitName
    });

    if (!variant) {
      this.#ttOffline = true;
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
      if (this.#ttOffline) {
        return;
      }

      void sendAssignmentNotification({
        client: this.#client,
        visitor: this,
        assignment
      });

      assignment.setUnsynced(false);
    } catch (e) {
      this.logError(`test_track notify error: ${String(e)}`);
    }
  }
}
