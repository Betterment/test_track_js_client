import { getABVariants } from './abConfiguration';
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

class Visitor {
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
      const assignments = Assignment.fromJsonArray(data.assignments);
      return new Visitor({ client, splitRegistry, id: data.id, assignments, ttOffline: false });
    } catch {
      return new Visitor({ client, splitRegistry, id, assignments: [], ttOffline: true });
    }
  }

  private client: Client;
  private splitRegistry: SplitRegistry;

  private _id: string;
  private _assignments: Assignment[];
  private _ttOffline?: boolean;
  private _errorLogger: (errorMessage: string) => void;
  private _assignmentRegistry?: AssignmentRegistry | null;

  public analytics: AnalyticsProvider;

  constructor({ client, splitRegistry, id, assignments, ttOffline }: VisitorOptions) {
    this.client = client;
    this.splitRegistry = splitRegistry;
    this._id = id;
    this._assignments = assignments;
    this._ttOffline = ttOffline;
    this._errorLogger = errorMessage => window.console.error(errorMessage);
    this.analytics = mixpanelAnalytics;
  }

  getId() {
    return this._id;
  }

  getAssignmentRegistry() {
    if (!this._assignmentRegistry) {
      this._assignmentRegistry = this._assignments.reduce((registry, assignment) => {
        return {
          ...registry,
          [assignment.getSplitName()]: assignment
        };
      }, {});
    }

    return this._assignmentRegistry;
  }

  vary(splitName: string, options: VaryOptions): void {
    const defaultVariant = options.defaultVariant.toString();
    const { variants, context } = options;

    const assignment = this._getAssignmentFor(splitName, context);
    const { isDefaulted } = vary({
      assignment,
      visitor: this,
      defaultVariant,
      variants,
      splitRegistry: this.splitRegistry
    });

    if (isDefaulted) {
      assignment.setVariant(defaultVariant);
      assignment.setUnsynced(true);
      assignment.setContext(context);
    }

    this.notifyUnsyncedAssignments();
  }

  ab(splitName: string, options: AbOptions) {
    const variants = getABVariants({
      splitName,
      trueVariant: options.trueVariant || 'true',
      visitor: this,
      splitRegistry: this.splitRegistry
    });
    const variantConfiguration: VaryOptions['variants'] = {};

    variantConfiguration[variants.true.toString()] = function () {
      options.callback(true);
    };

    variantConfiguration[variants.false.toString()] = function () {
      options.callback(false);
    };

    this.vary(splitName, {
      context: options.context,
      variants: variantConfiguration,
      defaultVariant: variants.false
    });
  }

  setErrorLogger(errorLogger: (errorMessage: string) => void) {
    this._errorLogger = errorLogger;
  }

  logError(errorMessage: string) {
    this._errorLogger.call(null, errorMessage); // call with null context to ensure we don't leak the visitor object to the outside world
  }

  async linkIdentifier(identifierType: string, value: number) {
    const response = await this.client.postIdentifier({
      visitor_id: this.getId(),
      identifier_type: identifierType,
      value: value.toString()
    });

    const otherVisitor = new Visitor({
      client: this.client,
      splitRegistry: this.splitRegistry,
      id: response.visitor.id,
      assignments: Assignment.fromJsonArray(response.visitor.assignments)
    });

    this._merge(otherVisitor);
    this.notifyUnsyncedAssignments();
  }

  setAnalytics(analytics: AnalyticsProvider) {
    this.analytics = analytics;
  }

  notifyUnsyncedAssignments() {
    this._getUnsyncedAssignments().forEach(this._notify.bind(this));
  }

  _getUnsyncedAssignments() {
    const registry = this.getAssignmentRegistry();
    return Object.keys(registry).reduce<Assignment[]>((result, assignmentName) => {
      const assignment = registry[assignmentName];
      if (assignment.isUnsynced()) {
        result.push(assignment);
      }
      return result;
    }, []);
  }

  _merge(otherVisitor: Visitor) {
    const assignmentRegistry = this.getAssignmentRegistry();
    const otherAssignmentRegistry = otherVisitor.getAssignmentRegistry();

    this._id = otherVisitor.getId();

    Object.assign(assignmentRegistry, otherAssignmentRegistry);
  }

  _getAssignmentFor(splitName: string, context: string) {
    return this.getAssignmentRegistry()[splitName] || this._generateAssignmentFor(splitName, context);
  }

  _generateAssignmentFor(splitName: string, context: string) {
    const variant = calculateVariant({
      visitor: this,
      splitRegistry: this.splitRegistry,
      splitName
    });

    if (!variant) {
      this._ttOffline = true;
    }

    const assignment = new Assignment({
      splitName: splitName,
      variant: variant,
      context: context,
      isUnsynced: true
    });

    this._assignments.push(assignment);

    // reset derived datastores to trigger rebuilding
    this._assignmentRegistry = null;

    return assignment;
  }

  _notify(assignment: Assignment) {
    try {
      if (this._ttOffline) {
        return;
      }

      // Potential bug here: This function returns a promise.
      sendAssignmentNotification({
        client: this.client,
        visitor: this,
        assignment
      });
      assignment.setUnsynced(false);
    } catch (e) {
      this.logError('test_track notify error: ' + e);
    }
  }
}

export default Visitor;
