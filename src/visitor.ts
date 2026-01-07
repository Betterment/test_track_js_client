import { getFalseVariant } from './abConfiguration';
import Assignment from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './analyticsProvider';
import { v4 as uuid } from 'uuid';
import { calculateVariant } from './calculateVariant';
import { vary, type Variants } from './vary';
import type { AnalyticsProvider } from './analyticsProvider';
import type { Client } from './client';
import type { SplitRegistry } from './splitRegistry';

export type VaryOptions = {
  variants: Variants;
  context: string;
  defaultVariant: boolean | string;
};

export type AbOptions = {
  callback: (assignment: boolean) => void;
  context: string;
  trueVariant?: string;
};

type VisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  id: string;
  assignments: Assignment[];
  ttOffline?: boolean;
};

type LoadVisitorOptions = {
  client: Client;
  splitRegistry: SplitRegistry;
  id: string | undefined;
  assignments: Assignment[] | null;
};

type AssignmentRegistry = {
  [splitName: string]: Assignment;
};

export default class Visitor {
  static async loadVisitor(options: LoadVisitorOptions): Promise<Visitor> {
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

  #client: Client;
  #splitRegistry: SplitRegistry;
  #id: string;
  #assignments: AssignmentRegistry;
  #ttOffline: boolean | undefined;
  #errorLogger: (errorMessage: string) => void;

  public analytics: AnalyticsProvider;

  constructor({ client, splitRegistry, id, assignments, ttOffline }: VisitorOptions) {
    this.#client = client;
    this.#splitRegistry = splitRegistry;
    this.#id = id;
    this.#ttOffline = ttOffline;
    this.#errorLogger = errorMessage => console.error(errorMessage);
    this.analytics = mixpanelAnalytics;
    this.#assignments = Object.fromEntries(assignments.map(assignment => [assignment.getSplitName(), assignment]));
  }

  getId() {
    return this.#id;
  }

  getAssignmentRegistry(): AssignmentRegistry {
    return this.#assignments;
  }

  vary(splitName: string, options: VaryOptions): void {
    const defaultVariant = options.defaultVariant.toString();
    const { variants, context } = options;

    const assignment = this._getAssignmentFor(splitName, context);
    const { isDefaulted } = vary({
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
  }

  ab(splitName: string, options: AbOptions) {
    const trueVariant = options.trueVariant || 'true';
    const falseVariant = getFalseVariant({
      splitName,
      trueVariant,
      splitRegistry: this.#splitRegistry,
      logError: message => this.logError(message)
    });

    this.vary(splitName, {
      context: options.context,
      defaultVariant: falseVariant,
      variants: {
        [trueVariant]: () => options.callback(true),
        [falseVariant]: () => options.callback(false)
      }
    });
  }

  setErrorLogger(errorLogger: (errorMessage: string) => void) {
    this.#errorLogger = errorLogger;
  }

  logError(errorMessage: string) {
    this.#errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
  }

  async linkIdentifier(identifierType: string, value: number) {
    const data = await this.#client.postIdentifier({
      visitor_id: this.getId(),
      identifier_type: identifierType,
      value: value.toString()
    });

    const otherVisitor = new Visitor({
      client: this.#client,
      splitRegistry: this.#splitRegistry,
      id: data.visitor.id,
      assignments: data.visitor.assignments.map(Assignment.fromV1Assignment)
    });

    this.#id = otherVisitor.getId();
    Object.assign(this.#assignments, otherVisitor.getAssignmentRegistry());
    this.notifyUnsyncedAssignments();
  }

  setAnalytics(analytics: AnalyticsProvider) {
    this.analytics = analytics;
  }

  notifyUnsyncedAssignments() {
    this._getUnsyncedAssignments().forEach(this._notify.bind(this));
  }

  _getUnsyncedAssignments() {
    return Object.values(this.getAssignmentRegistry()).filter(assignment => assignment.isUnsynced());
  }

  _getAssignmentFor(splitName: string, context: string) {
    return this.getAssignmentRegistry()[splitName] || this._generateAssignmentFor(splitName, context);
  }

  _generateAssignmentFor(splitName: string, context: string) {
    const variant = calculateVariant({
      visitor: this,
      splitRegistry: this.#splitRegistry,
      splitName
    });

    if (!variant) {
      this.#ttOffline = true;
    }

    const assignment = new Assignment({
      splitName: splitName,
      variant: variant,
      context: context,
      isUnsynced: true
    });

    this.#assignments[splitName] = assignment;
    return assignment;
  }

  _notify(assignment: Assignment) {
    try {
      if (this.#ttOffline) {
        return;
      }

      // Potential bug here: This function returns a promise.
      sendAssignmentNotification({
        client: this.#client,
        visitor: this,
        assignment
      });
      assignment.setUnsynced(false);
    } catch (e) {
      this.logError('test_track notify error: ' + e);
    }
  }
}
