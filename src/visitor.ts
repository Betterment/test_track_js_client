import { getABVariants } from './abConfiguration';
import Assignment from './assignment';
import { sendAssignmentNotification } from './assignmentNotification';
import { mixpanelAnalytics } from './mixpanelAnalytics';
import { v4 as uuid } from 'uuid';
import { calculateVariant } from './calculateVariant';
import { vary, type Variants } from './vary';
import type { Config } from './config';
import type { AnalyticsProvider } from './analyticsProvider';
import { createClient, type V1Visitor } from './client';

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

export type VisitorOptions = {
  config: Config;
  id: string;
  assignments: Assignment[];
  ttOffline?: boolean;
};

type AssignmentRegistry = {
  [splitName: string]: Assignment;
};

class Visitor {
  static loadVisitor(config: Config, visitorId: string | undefined) {
    if (visitorId) {
      const assignments = config.assignments;
      if (assignments) {
        return Promise.resolve(
          new Visitor({
            config,
            id: visitorId,
            assignments,
            ttOffline: false
          })
        );
      } else {
        const client = createClient({ url: config.url.toString() });
        return client
          .getVisitor(visitorId)
          .then((data) => {
            return new Visitor({
              config,
              id: data.id,
              assignments: Assignment.fromJsonArray(data.assignments),
              ttOffline: false
            });
          })
          .catch(() => {
            return new Visitor({
              config,
              id: visitorId,
              assignments: [],
              ttOffline: true
            });
          });
      }
    } else {
      return Promise.resolve(
        new Visitor({
          config,
          id: uuid(),
          assignments: [],
          ttOffline: false
        })
      );
    }
  }

  /** @internal */
  config: Config;

  private _id: string;
  private _assignments: Assignment[];
  private _ttOffline?: boolean;
  private _errorLogger: (errorMessage: string) => void;
  private _assignmentRegistry?: AssignmentRegistry | null;

  public analytics: AnalyticsProvider;

  constructor({ config, id, assignments, ttOffline }: VisitorOptions) {
    this.config = config;
    this._id = id;
    this._assignments = assignments;
    this._ttOffline = ttOffline;

    this._errorLogger = function (errorMessage) {
      window.console.error(errorMessage);
    };

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
      splitRegistry: this.config.splitRegistry
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
      splitRegistry: this.config.splitRegistry
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
    const client = createClient({ url: this.config.url.toString() });
    const response = await client.postIdentifier({
      visitor_id: this.getId(),
      identifier_type: identifierType,
      value: value.toString()
    });

    const otherVisitor = new Visitor({
      config: this.config,
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
      splitRegistry: this.config.splitRegistry,
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
        client: createClient({ url: this.config.url.toString() }),
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
